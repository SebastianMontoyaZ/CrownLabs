package tenant_controller

import (
	"context"

	rbacv1 "k8s.io/api/rbac/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/klog/v2"
	ctrl "sigs.k8s.io/controller-runtime"

	crownlabsv1alpha2 "github.com/netgroup-polito/CrownLabs/operators/api/v1alpha2"
	"github.com/netgroup-polito/CrownLabs/operators/pkg/utils"
)

func (r *TenantReconciler) handlePersonalWorkspaceRoleBindings(ctx context.Context, tn *crownlabsv1alpha2.Tenant) error {
	if !tn.Status.PersonalNamespace.Created {
		// if the personal namespace is not created, mark the personal workspace as not created and skip the rest of the logic
		personalWorkspaceStatusDisable(tn)
		return nil
	}

	createPWs := tn.Spec.CreatePersonalWorkspace
	inheritedLabels := map[string]string{r.TargetLabelKey: r.TargetLabelValue}
	manageTemplatesRB := generateManageTemplatesRoleBinding(tn.Name, tn.Status.PersonalNamespace.Name, inheritedLabels)
	if createPWs {
		res, err := ctrl.CreateOrUpdate(ctx, r.Client, &manageTemplatesRB, func() error {
			return ctrl.SetControllerReference(tn, &manageTemplatesRB, r.Scheme)
		})
		if err != nil {
			return err
		}
		klog.Infof("RoleBinding for tenant %s %s", tn.Name, res)
		personalWorkspaceStatusEnable(tn)
	} else {
		personalWorkspaceStatusDisable(tn)
		if err := utils.EnforceObjectAbsence(ctx, r.Client, &manageTemplatesRB, "personal workspace role binding"); err != nil {
			return err
		}
	}
	return nil
}

func generateManageTemplatesRoleBinding(name string, namespace string, inheritedLabels map[string]string) rbacv1.RoleBinding {
	rb := rbacv1.RoleBinding{ObjectMeta: metav1.ObjectMeta{
		Name:      "crownlabs-manage-templates",
		Namespace: namespace,
	}}
	rb.Labels = inheritedLabels
	rb.Labels["crownlabs.polito.it/managed-by"] = "tenant"
	rb.RoleRef = rbacv1.RoleRef{Kind: "ClusterRole", Name: "crownlabs-manage-templates", APIGroup: "rbac.authorization.k8s.io"}
	rb.Subjects = []rbacv1.Subject{{Kind: "User", Name: name, APIGroup: "rbac.authorization.k8s.io"}}
	return rb
}

// modify the state of the personal workspace to enabled
func personalWorkspaceStatusEnable(tn *crownlabsv1alpha2.Tenant) {
	tn.Status.PersonalWorkspaceNamespace.Created = true
	tn.Status.PersonalWorkspaceNamespace.Name = tn.Status.PersonalNamespace.Name
}

// modify the state of the personal workspace to disabled
func personalWorkspaceStatusDisable(tn *crownlabsv1alpha2.Tenant) {
	tn.Status.PersonalWorkspaceNamespace.Created = false
	tn.Status.PersonalWorkspaceNamespace.Name = ""
}
