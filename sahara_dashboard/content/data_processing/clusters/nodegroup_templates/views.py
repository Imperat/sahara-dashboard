# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
# implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import json

from django.core.urlresolvers import reverse
from django.http import HttpResponse
from django.utils.translation import ugettext_lazy as _
from django.views.generic import base as django_base


from horizon import exceptions
from horizon import tabs
from horizon.utils import memoized
from horizon import workflows

from sahara_dashboard.api import sahara as saharaclient
import sahara_dashboard.content.data_processing.clusters. \
    nodegroup_templates.tables as _tables
import sahara_dashboard.content.data_processing.clusters. \
    nodegroup_templates.tabs as _tabs
import sahara_dashboard.content.data_processing.clusters. \
    nodegroup_templates.workflows.copy as copy_flow
import sahara_dashboard.content.data_processing.clusters. \
    nodegroup_templates.workflows.create as create_flow
import sahara_dashboard.content.data_processing.clusters. \
    nodegroup_templates.workflows.edit as edit_flow
from sahara_dashboard.content.data_processing.utils import helpers


class ConfigurationStepView(django_base.View):

    def get(self, request, *args, **kwargs):
        hlps = helpers.Helpers(request)
        plugin = request.GET.get('plugin_name')
        plugin_version = request.GET.get('hadoop_version')
        process_id = request.GET.get('process_id')

        context = hlps.get_process_configs(
            plugin, plugin_version, process_id)

        return HttpResponse(json.dumps(context),
                            content_type='application/json')


class NodegroupTemplateDetailsView(tabs.TabView):
    tab_group_class = _tabs.NodegroupTemplateDetailsTabs
    template_name = 'horizon/common/_detail.html'
    page_title = "{{ template.name|default:template.id }}"

    @memoized.memoized_method
    def get_object(self):
        ngt_id = self.kwargs["template_id"]
        try:
            return saharaclient.nodegroup_template_get(self.request, ngt_id)
        except Exception:
            msg = _('Unable to retrieve details for '
                    'node group template "%s".') % ngt_id
            redirect = self.get_redirect_url()
            exceptions.handle(self.request, msg, redirect=redirect)

    def get_context_data(self, **kwargs):
        context = super(NodegroupTemplateDetailsView, self)\
            .get_context_data(**kwargs)
        node_group_template = self.get_object()
        context['template'] = node_group_template
        context['url'] = self.get_redirect_url()
        context['actions'] = self._get_actions(node_group_template)
        return context

    def _get_actions(self, node_group_template):
        table = _tables.NodegroupTemplatesTable(self.request)
        return table.render_row_actions(node_group_template)

    @staticmethod
    def get_redirect_url():
        return reverse("horizon:project:data_processing."
                       "clusters:index")


class CreateNodegroupTemplateView(workflows.WorkflowView):
    workflow_class = create_flow.CreateNodegroupTemplate
    success_url = (
        "horizon:project:data_processing.clusters:"
        "create-nodegroup-template")
    classes = ("ajax-modal",)
    template_name = "nodegroup_templates/create.html"
    page_title = _("Create Node Group Template")


class ConfigureNodegroupTemplateView(workflows.WorkflowView):
    workflow_class = create_flow.ConfigureNodegroupTemplate
    success_url = ("horizon:project:"
                   "data_processing.clusters:index")
    template_name = "nodegroup_templates/configure-old.html"
    ajax_template_name = "nodegroup_templates/configure.html"
    page_title = _("Create Node Group Template")

    def get_initial(self):
        initial = super(ConfigureNodegroupTemplateView, self).get_initial()
        initial.update(self.kwargs)
        return initial

    def post(self, request, *args, **kwargs):
        if 'additional' not in self.kwargs.keys():
            self.kwargs['additional'] = {}
        self.kwargs['additional']['hadoop_version'] = \
            request.POST['hadoop_version']
        self.kwargs['additional']['plugin_name'] = request.POST['plugin_name']
        self.kwargs['additional']['clear_storage'] = True

        return super(ConfigureNodegroupTemplateView, self).post(
            request, *args, **kwargs)

    def get_context_data(self, **kwargs):
        context = super(ConfigureNodegroupTemplateView,
                        self).get_context_data(**kwargs)

        try:
            context['plugin'] = self.get_initial()['plugin_name']
            context['hadoop_version'] = self.get_initial()['hadoop_version']
        except Exception:
            context['plugin'] = self.get_initial()['additional']['plugin_name']
            context['hadoop_version'] = self.get_initial(
            )['additional']['hadoop_version']
            context['clear_storage'] = self.get_initial(
            )['additional']['clear_storage']

        context['preloaded_tabs'] = ["generalconfigaction",
                                     "selectnodeprocessesaction",
                                     "securityconfigaction"]
        return context


class CopyNodegroupTemplateView(ConfigureNodegroupTemplateView):
    workflow_class = copy_flow.CopyNodegroupTemplate

    def get_context_data(self, **kwargs):
        context = super(CopyNodegroupTemplateView, self)\
            .get_context_data(**kwargs)

        context["template_id"] = kwargs["template_id"]
        context['plugin'] = self.get_initial()['plugin_name']
        context['hadoop_version'] = self.get_initial()['hadoop_version']
        context['preloaded_tabs'] = ["generalconfigaction",
                                     "selectnodeprocessesaction",
                                     "securityconfigaction"]
        context['json_loaded_tabs'] = []
        node_group_template = self.get_object()
        if node_group_template:
            for service, config in node_group_template.node_configs.items():
                if config:
                    context['preloaded_tabs'].append(
                        service.lower() + "-parameters")
                    context['json_loaded_tabs'].append(
                        service.lower() + "-parameters")
        return context

    def get_object(self, *args, **kwargs):
        if not hasattr(self, "_object"):
            template_id = self.kwargs['template_id']
            try:
                template = saharaclient.nodegroup_template_get(self.request,
                                                               template_id)
            except Exception:
                template = None
                exceptions.handle(self.request,
                                  _("Unable to fetch template object."))
            self._object = template
        return self._object

    def get_initial(self):
        initial = super(CopyNodegroupTemplateView, self).get_initial()
        initial['template_id'] = self.kwargs['template_id']
        return initial


class EditNodegroupTemplateView(CopyNodegroupTemplateView):
    workflow_class = edit_flow.EditNodegroupTemplate
