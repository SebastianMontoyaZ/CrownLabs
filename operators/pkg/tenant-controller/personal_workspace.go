package tenant_controller

import (
	"context"
	"fmt"

	crownlabsv1alpha1 "github.com/netgroup-polito/CrownLabs/operators/api/v1alpha1"
	crownlabsv1alpha2 "github.com/netgroup-polito/CrownLabs/operators/api/v1alpha2"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/klog/v2"
)

// handlePersonalWorkspaceCreation checks if the tenant has a personal workspace, and creates it if missing.
func (r *TenantReconciler) handlePersonalWorkspaceCreation(ctx context.Context, tn *crownlabsv1alpha2.Tenant) (bool, error) {
	personalWsName := fmt.Sprintf("personal-%s", tn.Name)
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
