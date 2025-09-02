// Copyright 2020-2025 Politecnico di Torino
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package tenant

import (
	"context"
	"fmt"

	rbacv1 "k8s.io/api/rbac/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	ctrl "sigs.k8s.io/controller-runtime"

	crownlabsv1alpha2 "github.com/netgroup-polito/CrownLabs/operators/api/v1alpha2"
	"github.com/netgroup-polito/CrownLabs/operators/pkg/forge"
	"github.com/netgroup-polito/CrownLabs/operators/pkg/utils"
)

func (r *Reconciler) handlePersonalWorkspace(ctx context.Context, tn *crownlabsv1alpha2.Tenant) error {
	log := ctrl.LoggerFrom(ctx)
	if !tn.Status.PersonalNamespace.Created {
		// if the personal namespace is not created, mark the personal workspace as not created and skip the rest.
		setPersonalWorkspaceStatusDisabled(tn)
		log.Info("Tenant namespace does not exist, skipping personal workspace handling")
		return nil
	}
	manageTemplatesRB := rbacv1.RoleBinding{ObjectMeta: metav1.ObjectMeta{Name: forge.ManageTemplatesRoleName, Namespace: tn.Status.PersonalNamespace.Name}}
	if tn.Spec.CreatePersonalWorkspace {
		forge.ConfigurePersonalWorkspaceManageTemplatesBinding(tn, &manageTemplatesRB, forge.UpdateTenantResourceCommonLabels(manageTemplatesRB.Labels, r.TargetLabel))
		res, err := ctrl.CreateOrUpdate(ctx, r.Client, &manageTemplatesRB, func() error {
			return ctrl.SetControllerReference(tn, &manageTemplatesRB, r.Scheme)
		})
		if err != nil {
			return err
		}
		log.Info(fmt.Sprintf("Personal Workspace role binding %s", res))
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