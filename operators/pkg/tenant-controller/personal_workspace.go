package tenant_controller

import (
	"context"
	"fmt"
	"strings"

	crownlabsv1alpha1 "github.com/netgroup-polito/CrownLabs/operators/api/v1alpha1"
	crownlabsv1alpha2 "github.com/netgroup-polito/CrownLabs/operators/api/v1alpha2"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/klog/v2"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

// checkPersonalWorkspaceExists checks if the personal workspace exists
// by trying to get it
func (r *TenantReconciler) checkPersonalWorkspaceExists(ctx context.Context, tn *crownlabsv1alpha2.Tenant) (bool,error) {
	var personalWorkspace crownlabsv1alpha1.Workspace
	personalWorkspaceNamespacedName := types.NamespacedName{Name: getTenantPersonalWorkspaceName(tn)}
	personalWorkspaceExists := true
	// try to get the personal workspace
	err := r.Get(ctx, personalWorkspaceNamespacedName,  &personalWorkspace)
	// if unable to get the personal workspace, it doesn't exist
	if err != nil {
		personalWorkspaceExists = false
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
					CPU:       resource.MustParse(r.PWsDefaultCPU),   // 2 cores
					Memory:    resource.MustParse(r.PWsDefaultMemory), // 4 GiB RAM
					Instances: uint32(r.PWsDefaultInstances),                         // 2 instances
				},
			},
		}
	// create the personal workspace resource
	err := r.Client.Create(ctx, ws)
	return client.IgnoreAlreadyExists(err)
}

func (r *TenantReconciler) enforcePersonalWorkspaceRole(ctx context.Context, tn *crownlabsv1alpha2.Tenant) error {
	personalWorkspaceName:= getTenantPersonalWorkspaceName(tn)
	personalWorkspaceIndex:= -1
	tenantIsManager := false
	// search for the personal workspace in the workspaces list
	for i, ws := range tn.Spec.Workspaces {
		if ws.Name == personalWorkspaceName {
			personalWorkspaceIndex = i
			if ws.Role == crownlabsv1alpha2.Manager {
				tenantIsManager = true
			}
			break
		}
	}
	resourceModified:=false
	// enforce the personal workspace role
	if personalWorkspaceIndex == -1{
		klog.Info("Subscribing tenant to personal workspace")
		tn.Spec.Workspaces = append(tn.Spec.Workspaces, crownlabsv1alpha2.TenantWorkspaceEntry{
			Name: personalWorkspaceName,
			Role: crownlabsv1alpha2.Manager,
		})
		resourceModified = true
	}else if !tenantIsManager {
		tn.Spec.Workspaces[personalWorkspaceIndex].Role = crownlabsv1alpha2.Manager
		resourceModified = true
	}
	// update the tenant if it was modified and return
	if resourceModified {
		return r.Client.Update(ctx, tn)
	}
	return nil
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

func (r *TenantReconciler) handlePersonalWorkspaceEnforcement(ctx context.Context, tn *crownlabsv1alpha2.Tenant) (error) {
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
	// enforce the personal workspace role for the tenant
	err = r.enforcePersonalWorkspaceRole(ctx, tn)
	if err != nil {
		klog.Errorf("Error when enforcing personal workspace role for tenant %s -> %s", tn.Name, err)
		return err
	}
	return nil
}

func getTenantPersonalWorkspaceName(tn *crownlabsv1alpha2.Tenant) string {
	sanitizedTenantName := strings.ReplaceAll(tn.Name, ".", "-")
	return fmt.Sprintf("personal-%s", sanitizedTenantName)
}