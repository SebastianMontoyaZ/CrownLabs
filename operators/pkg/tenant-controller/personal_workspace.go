package tenant_controller

import (
	"context"
	"fmt"
	"strings"

	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/klog/v2"
	"sigs.k8s.io/controller-runtime/pkg/client"

	crownlabsv1alpha1 "github.com/netgroup-polito/CrownLabs/operators/api/v1alpha1"
	crownlabsv1alpha2 "github.com/netgroup-polito/CrownLabs/operators/api/v1alpha2"
)

// checkPersonalWorkspaceExists checks if the personal workspace exists
// by trying to get it
func (r *TenantReconciler) checkPersonalWorkspaceExists(ctx context.Context, tn *crownlabsv1alpha2.Tenant) (bool, error) {
	var personalWorkspace crownlabsv1alpha1.Workspace
	personalWorkspaceNamespacedName := types.NamespacedName{Name: getTenantPersonalWorkspaceName(tn)}
	personalWorkspaceExists := true
	// try to get the personal workspace
	err := r.Get(ctx, personalWorkspaceNamespacedName, &personalWorkspace)
	// if unable to get the personal workspace, it doesn't exist
	if err != nil {
		personalWorkspaceExists = false
		tn.Status.PersonalWorkspace.Created = false
		tn.Status.PersonalWorkspace.Name = ""
	}
	// return the result, the error should be nil if the personal workspace exists
	return personalWorkspaceExists, client.IgnoreNotFound(err)
}

func (r *TenantReconciler) createPersonalWorkspace(ctx context.Context, tn *crownlabsv1alpha2.Tenant) error {
	// create the personal workspace object
	personalWorkspaceName := getTenantPersonalWorkspaceName(tn)
	ws := &crownlabsv1alpha1.Workspace{
		ObjectMeta: metav1.ObjectMeta{
			Name: personalWorkspaceName,
			Labels: map[string]string{
				"crownlabs.polito.it/type": "personal",
				r.TargetLabelKey:           r.TargetLabelValue,
			},
		},
		Spec: crownlabsv1alpha1.WorkspaceSpec{
			PrettyName: fmt.Sprintf("%s's Personal Workspace", tn.Spec.FirstName),
			Quota: crownlabsv1alpha1.WorkspaceResourceQuota{
				CPU:       resource.MustParse(r.PWsDefaultCPU),    // 2 cores
				Memory:    resource.MustParse(r.PWsDefaultMemory), // 4 GiB RAM
				Instances: uint32(r.PWsDefaultInstances),          // 2 instances
			},
		},
	}
	// create the personal workspace resource
	err := client.IgnoreAlreadyExists(r.Client.Create(ctx, ws))
	if err == nil {
		tn.Status.PersonalWorkspace.Created = true
		tn.Status.PersonalWorkspace.Name = personalWorkspaceName
	}
	// return the error
	return err
}

func (r *TenantReconciler) enforcePersonalWorkspaceRole(ctx context.Context, tn *crownlabsv1alpha2.Tenant) error {
	personalWorkspaceName := getTenantPersonalWorkspaceName(tn)
	personalWorkspaceIndex := getTenantPersonalWorkspaceIndex(tn)
	tenantIsManager := personalWorkspaceIndex != -1 && tn.Spec.Workspaces[personalWorkspaceIndex].Role == crownlabsv1alpha2.Manager
	resourceModified := false
	// enforce the personal workspace role
	if personalWorkspaceIndex == -1 {
		klog.Info("Subscribing tenant to personal workspace")
		tn.Spec.Workspaces = append(tn.Spec.Workspaces, crownlabsv1alpha2.TenantWorkspaceEntry{
			Name: personalWorkspaceName,
			Role: crownlabsv1alpha2.Manager,
		})
		resourceModified = true
	} else if !tenantIsManager {
		tn.Spec.Workspaces[personalWorkspaceIndex].Role = crownlabsv1alpha2.Manager
		resourceModified = true
	}
	// update the tenant if it was modified and return
	if resourceModified {
		klog.Infof("Enforced role for personal workspace for tenant %s", tn.Name)
		// return r.Client.Update(ctx, tn)
	}
	return nil
}

func (r *TenantReconciler) deletePersonalWorkspace(ctx context.Context, tn *crownlabsv1alpha2.Tenant) error {
	err := client.IgnoreNotFound(r.Client.Delete(ctx, &crownlabsv1alpha1.Workspace{ObjectMeta: metav1.ObjectMeta{Name: getTenantPersonalWorkspaceName(tn)}}))
	originalWorkspaces := tn.Spec.Workspaces
	if pwsIndex := getTenantPersonalWorkspaceIndex(tn); pwsIndex != -1 {
		tn.Spec.Workspaces = originalWorkspaces[:pwsIndex]
		if pwsIndex+1 < len(originalWorkspaces) {
			tn.Spec.Workspaces = append(tn.Spec.Workspaces, originalWorkspaces[pwsIndex+1:]...)
		}
	}
	tn.Status.PersonalWorkspace.Created = false
	tn.Status.PersonalWorkspace.Name = ""
	return err
}

// handlePersonalWorkspaceCreation checks if the tenant has a personal workspace, and creates it if missing.
func (r *TenantReconciler) handlePersonalWorkspaceCreation(ctx context.Context, tn *crownlabsv1alpha2.Tenant) (bool, error) {
	personalWsName := getTenantPersonalWorkspaceName(tn)
	hasPersonalWs := false
	for _, ws := range tn.Spec.Workspaces {
		if ws.Name == personalWsName {
			hasPersonalWs = true
			break
		}
	}
	if !hasPersonalWs {
		// Create the Workspace CR if it doesn't exist
		ws := &crownlabsv1alpha1.Workspace{
			ObjectMeta: metav1.ObjectMeta{
				Name: personalWsName,
				Labels: map[string]string{
					"crownlabs.polito.it/type": "personal",
				},
			},
			Spec: crownlabsv1alpha1.WorkspaceSpec{
				PrettyName: fmt.Sprintf("%s's Personal Workspace", tn.Spec.FirstName),
				Quota: crownlabsv1alpha1.WorkspaceResourceQuota{
					CPU:       resource.MustParse("2"),   // 2 cores
					Memory:    resource.MustParse("4Gi"), // 4 GiB RAM
					Instances: 2,                         // 2 instances
				},
			},
		}
		if err := r.Client.Create(ctx, ws); err != nil && !apierrors.IsAlreadyExists(err) {
			klog.Errorf("Failed to create personal workspace %s for tenant %s: %v", personalWsName, tn.Name, err)
			return false, err
		}

		// Add to tenant's workspaces as manager
		tn.Spec.Workspaces = append(tn.Spec.Workspaces, crownlabsv1alpha2.TenantWorkspaceEntry{
			Name: personalWsName,
			Role: crownlabsv1alpha2.Manager,
		})
		if err := r.Update(ctx, tn); err != nil {
			klog.Errorf("Failed to update tenant %s with personal workspace: %v", tn.Name, err)
			return false, err
		}
		// Requeue to ensure the rest of the logic runs with the updated tenant
		return true, nil
	}
	return false, nil
}

func (r *TenantReconciler) handlePersonalWorkspaceEnforcement(ctx context.Context, tn *crownlabsv1alpha2.Tenant) error {
	// if the tenant doesn't want a personal workspace, return
	if !tn.Spec.CreatePersonalWorkspace {
		klog.Infof("Enforcing personal workspace absence for tenant %s", tn.Name)
		r.deletePersonalWorkspace(ctx, tn)
		return nil
	}
	klog.Infof("Enforcing personal workspace for tenant %s", tn.Name)
	// check if the personal workspace exists
	personalWorkspaceExists, err := r.checkPersonalWorkspaceExists(ctx, tn)
	if err != nil {
		klog.Errorf("Error when checking if personal workspace exists for tenant %s -> %s", tn.Name, err)
		return err
	} else if !personalWorkspaceExists {
		// if the personal workspace doesn't exist, create it
		klog.Infof("Creating personal workspace for tenant %s", tn.Name)
		err = r.createPersonalWorkspace(ctx, tn)
		if err != nil {
			klog.Errorf("Error when creating personal workspace for tenant %s -> %s", tn.Name, err)
			return err
		}
	}
	r.Status().Update(ctx, tn)
	// enforce the personal workspace role for the tenant
	err = r.enforcePersonalWorkspaceRole(ctx, tn)
	if err != nil {
		klog.Errorf("Error when enforcing personal workspace role for tenant %s -> %s", tn.Name, err)
		return err
	}
	r.Client.Update(ctx, tn)
	return nil
}

func getTenantPersonalWorkspaceName(tn *crownlabsv1alpha2.Tenant) string {
	sanitizedTenantName := strings.ReplaceAll(tn.Name, ".", "-")
	return fmt.Sprintf("personal-%s", sanitizedTenantName)
}
func getTenantPersonalWorkspaceIndex(tn *crownlabsv1alpha2.Tenant) int {
	pwsName := getTenantPersonalWorkspaceName(tn)
	for i, ws := range tn.Spec.Workspaces {
		if ws.Name == pwsName {
			return i
		}
	}
	return -1
}
