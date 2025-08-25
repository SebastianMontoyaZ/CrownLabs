package tenant

import (
	"context"

	rbacv1 "k8s.io/api/rbac/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/klog/v2"
	ctrl "sigs.k8s.io/controller-runtime"

	crownlabsv1alpha2 "github.com/netgroup-polito/CrownLabs/operators/api/v1alpha2"
	"github.com/netgroup-polito/CrownLabs/operators/pkg/forge"
	"github.com/netgroup-polito/CrownLabs/operators/pkg/utils"
)

func (r *Reconciler) handlePersonalWorkspaceRoleBindings(ctx context.Context, tn *crownlabsv1alpha2.Tenant) error {
	createPWs := tn.Spec.CreatePersonalWorkspace
	if !tn.Status.PersonalNamespace.Created {
		// if the personal namespace is not created, mark the personal workspace as not created and skip the rest
		setPersonalWorkspaceStatusDisabled(tn)
		return nil
	}
	manageTemplatesRB := rbacv1.RoleBinding{ObjectMeta: metav1.ObjectMeta{Name: "crownlabs-manage-templates", Namespace: tn.Status.PersonalNamespace.Name}}
	forge.ConfigurePersonalWorkspaceManageTemplatesBinding(&manageTemplatesRB, tn, forge.UpdateTenantResourceCommonLabels(manageTemplatesRB.Labels, r.TargetLabel))
	if  createPWs {
		res, err := ctrl.CreateOrUpdate(ctx, r.Client, &manageTemplatesRB, func() error {
			return ctrl.SetControllerReference(tn, &manageTemplatesRB, r.Scheme)
		})
		if err != nil {
			return err
		}
		klog.Infof("Personal Workspace role binding for tenant %s %s", tn.Name, res)
		setPersonalWorkspaceStatusEnabled(tn)
	} else {
		setPersonalWorkspaceStatusDisabled(tn)
		if err := utils.EnforceObjectAbsence(ctx, r.Client, &manageTemplatesRB, "personal workspace role binding"); err != nil {
			return err
		}
	}
	return nil
}

func setPersonalWorkspaceStatusEnabled(tn *crownlabsv1alpha2.Tenant) bool {
	changed := false
	if !tn.Status.PersonalWorkspace.Created || tn.Status.PersonalWorkspace.Name != tn.Status.PersonalNamespace.Name {
		tn.Status.PersonalWorkspace.Created = tn.Spec.CreatePersonalWorkspace
		tn.Status.PersonalWorkspace.Name = tn.Status.PersonalNamespace.Name
		changed = true
	}
	return changed
}

func setPersonalWorkspaceStatusDisabled(tn *crownlabsv1alpha2.Tenant) bool {
	changed := false
	if tn.Status.PersonalWorkspace.Created || tn.Status.PersonalWorkspace.Name != "" {
		tn.Status.PersonalWorkspace.Created = false
		tn.Status.PersonalWorkspace.Name = ""
		changed = true
	}
	return changed
}