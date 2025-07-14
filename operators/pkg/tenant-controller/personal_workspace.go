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
	// return the result, the error should be nil if the personal workspace exists
	return personalWorkspaceExists, client.IgnoreNotFound(err)
}

func (r *TenantReconciler) createPersonalWorkspace(ctx context.Context, tn *crownlabsv1alpha2.Tenant) (*crownlabsv1alpha1.Workspace, error) {
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

	if err := r.Client.Create(ctx, ws); client.IgnoreAlreadyExists(err) != nil {
		klog.Errorf("Error when creating personal workspace for tenant %s -> %s", tn.Name, err)
		return nil, err
	} else if err == nil {
		klog.Infof("Created personal workspace for tenant %s", tn.Name)
	}
	return ws, nil
}

func (r *TenantReconciler) enforcePersonalWorkspaceRole(ctx context.Context, tn *crownlabsv1alpha2.Tenant) error {
	personalWorkspaceName := getTenantPersonalWorkspaceName(tn)
	personalWorkspaceIndex := getTenantPersonalWorkspaceIndex(tn)
	tenantIsManager := personalWorkspaceIndex != -1 && tn.Spec.Workspaces[personalWorkspaceIndex].Role == crownlabsv1alpha2.Manager
	personalWorkspaceEntry := crownlabsv1alpha2.TenantWorkspaceEntry{
		Name: personalWorkspaceName,
		Role: crownlabsv1alpha2.Manager,
	}
	// enforce the personal workspace role
	if personalWorkspaceIndex == -1 {
		tn.Spec.Workspaces = append(tn.Spec.Workspaces, personalWorkspaceEntry)
		klog.Infof("Subscribed tenant %s to personal workspace", tn.Name)
	} else if !tenantIsManager {
		tn.Spec.Workspaces[personalWorkspaceIndex] = personalWorkspaceEntry
		klog.Infof("Updated personal workspace role for tenant %s", tn.Name)
	}
	return nil
}

func (r *TenantReconciler) deletePersonalWorkspace(ctx context.Context, tn *crownlabsv1alpha2.Tenant) error {
	// the personal workspace subscription is also deleted by the workspace controller
	// deleting the personal workspace subscription and updating the tenant spec first to have changes propagated
	// and avoiding having the resource modified by the workspace controller
	if pwsIndex := getTenantPersonalWorkspaceIndex(tn); pwsIndex != -1 {
		tn.Spec.Workspaces = append(tn.Spec.Workspaces[:pwsIndex], tn.Spec.Workspaces[pwsIndex+1:]...)
		klog.Infof("Deleted personal workspace subscription for tenant %s", tn.Name)
	}
	if err := r.Client.Update(ctx, tn); err != nil {
		klog.Errorf("Error when updating spec for tenant after deleting personal workspace subscription %s -> %s", tn.Name, err)
		return err
	}
	// create a dummy personal workspace that represents the personal workspace to be deleted
	personalWorkspaceDummy := &crownlabsv1alpha1.Workspace{ObjectMeta: metav1.ObjectMeta{Name: getTenantPersonalWorkspaceName(tn)}}
	if err := r.Client.Delete(ctx, personalWorkspaceDummy); client.IgnoreNotFound(err) != nil {
		klog.Errorf("Error when deleting personal workspace for tenant %s -> %s", tn.Name, err)
		return err
	} else if err == nil {
		klog.Infof("Deleted personal workspace of tenant %s", tn.Name)
		return nil
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

func (r *TenantReconciler) handlePersonalWorkspaceEnforcement(ctx context.Context, tn *crownlabsv1alpha2.Tenant) error {
	if !tn.Spec.CreatePersonalWorkspace {
		return r.enforcePersonalWorkspaceAbsence(ctx, tn)
	} else {
		return r.enforcePersonalWorkspacePresence(ctx, tn)
	}
}

func (r *TenantReconciler) enforcePersonalWorkspacePresence(ctx context.Context, tn *crownlabsv1alpha2.Tenant) error {
	// create the personal workspace and update the status
	ws, err := r.createPersonalWorkspace(ctx, tn)
	if err != nil {
		klog.Errorf("Error when creating personal workspace for tenant %s -> %s", tn.Name, err)
		return err
	}
	tn.Status.PersonalWorkspace.Created = true
	tn.Status.PersonalWorkspace.Name = ws.Name
	if err := r.Status().Update(ctx, tn); err != nil {
		klog.Errorf("Error when updating status after enforcing personal workspace existence for tenant %s -> %s", tn.Name, err)
		return err
	}
	// enforce the personal workspace role for the tenant (adding the workspace to the tenant subscribed workspacesspec)
	if err := r.enforcePersonalWorkspaceRole(ctx, tn); err != nil {
		klog.Errorf("Error when enforcing personal workspace role for tenant %s -> %s", tn.Name, err)
		return err
	}
	// update the tenant spec
	if err := r.Client.Update(ctx, tn); err != nil {
		klog.Errorf("Error when updating spec after enforcing personal workspace role for tenant %s -> %s", tn.Name, err)
		return err
	}
	return nil
}
func (r *TenantReconciler) enforcePersonalWorkspaceAbsence(ctx context.Context, tn *crownlabsv1alpha2.Tenant) error {
	// delete workspace and make changes to tenant spec
	if err := r.deletePersonalWorkspace(ctx, tn); err != nil {
		klog.Errorf("Error when deleting personal workspace for tenant %s -> %s", tn.Name, err)
		return err
	}
	// update status
	tn.Status.PersonalWorkspace.Created = false
	tn.Status.PersonalWorkspace.Name = ""
	if err := r.Status().Update(ctx, tn); err != nil {
		klog.Errorf("Error when updating status for tenant after deleting personal workspace %s -> %s", tn.Name, err)
		return err
	}
	return nil
}
func (r *TenantReconciler) handlePersonalWorkspaceTenantDeletion(ctx context.Context, tnName string) error {
	tnDummy := &crownlabsv1alpha2.Tenant{
		ObjectMeta: metav1.ObjectMeta{
			Name: tnName,
		},
	}
	if err := r.deletePersonalWorkspace(ctx, tnDummy); err != nil {
		klog.Errorf("Error when deleting personal workspace for tenant %s -> %s", tnDummy.Name, err)
		return err
	}
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
