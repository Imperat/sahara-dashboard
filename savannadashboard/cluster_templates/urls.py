# vim: tabstop=4 shiftwidth=4 softtabstop=4

# Copyright (c) 2013 Mirantis Inc.
#
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


from django.conf.urls.defaults import patterns
from django.conf.urls.defaults import url

import savannadashboard.cluster_templates.views as views

urlpatterns = patterns('',
                       url(r'^$', views.ClusterTemplatesView.as_view(),
                           name='index'),
                       url(r'^$', views.ClusterTemplatesView.as_view(),
                           name='cluster-templates'),
                       url(r'^upload_file$',
                           views.UploadFileView.as_view(),
                           name='upload_file'),
                       url(r'^(?P<template_id>[^/]+)$',
                           views.ClusterTemplateDetailsView.as_view(),
                           name='details')
                       )
