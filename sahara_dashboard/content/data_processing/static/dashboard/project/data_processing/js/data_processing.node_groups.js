horizon.node_groups = {

	currentTabs: "",

	string_template:
            '<div class="form-group" style="display: block;">' + 
                '<label class="control-label" for="id_CONF:$process:$name">$name</label>' +
                '<span> </span>' +
                '<span class="help-icon" data-toggle="tooltip" data-placement="top" title="$help_text"><span class="fa fa-question-circle"></span></span>' +
                '<div class=" ">' +
                    '<input class="form-control" id="id_CONF:$process:$name" name="CONF:$process:$name" priority="$priority" type="text" value="$default_value">' +
                '</div>' +
            '</div>',

    bool_template:
            '<div class="form-group" style="display: block;">' +
                 '<div class="themable-checkbox">' +
                     '<div>' +
                         '<input $checked id="id_CONF:$process:$name" name="CONF:$process:$name" priority="$priority" type="checkbox" />' +
                         '<label for="id_CONF:$process:$name">' +
                         '<span> </span>' +
                             '<span>$name</span>' +
                             '<span class="help-icon" data-toggle="tooltip" data-placement="top" title="$help_text">' +
                                 '<span class="fa fa-question-circle"></span>' +
                             '</span>' +
                         '</label>' +
                     '</div>' +
                 '</div>' +
             '</div>',

    number_template:
             '<div class="form-group" style="display: block;">' + 
                '<label class="control-label" for="id_CONF:$process:$name">$name</label>' +
                '<span> </span>' +
                '<span class="help-icon" data-toggle="tooltip" data-placement="top" title="$help_text"><span class="fa fa-question-circle"></span></span>' +
                '<div class=" ">' +
                    '<input class="form-control" id="id_CONF:$process:$name" name="CONF:$process:$name" placeholder="$default_value" priority="$priority" type="text" pattern="^[ 0-9]+$" value="$default_value">' +
                '</div>' +
            '</div>',

    base_template: '<div class="row"><div class="col-sm-12">' + 
                                '<div class="input-group">' +
                                '<span class="input-group-addon">Filter configurations:</span>' +
                                '<input type="text" class="form-control field-filter" id="field-filter-$process_name">' +
                                '<span class="input-group-btn">' +
                                '<button type="button" id="btn-full--$process_name" class="btn btn-default full-config-show" onclick="horizon.node_groups.show_not_important_fields(this);">{% trans "Show full configs" %}</button>' +
                                '</span>' +
                                '</div>' +
                                '<br>' +
                                '</div></div>',

    normalise: function (data){
        if (typeof data.default_value === "string"){
            data.default_value = data.default_value.replace(/"/g, "&quot;");
        }
        if (typeof data.description === "string"){
            data.description = data.description.replace(/"/g, "&quot;");
        }
        data.name = data.name.replace(/"/g, "&quot;");
        return data;
    },

    show_not_important_fields: function (element) {
        var step_id = element.id.split("--")[1];
        var full_configs = $('#' + step_id).prop('full-configs');
        var fieldset = $(element).parents("fieldset")[0];

        if (full_configs){
            $("[priority='2']", fieldset).parents("div.form-group").hide();
            $("#" + element.id).text("Show full configs");
        } else {
            $("[priority='2']", fieldset).parents("div.form-group").show();
            $("#" + element.id).text("Hide full configs");
        }

        $('#' + step_id).prop('full-configs', !full_configs);
    },

    clearSessionStorage: function(checker, plugin_name, hadoop_version){
    	if (checker !== "True"){
        	sessionStorage.clear();
        }
        sessionStorage.setItem("id_hadoop_version", hadoop_version);
        sessionStorage.setItem("id_plugin_name", plugin_name);
    },

    create_auto_search: function (inpt, step_id) {

        if (inpt.has_filter) {
            return;
        }
        var input = inpt;
        inpt.has_filter = true;
        var oldValue = "";
        setInterval(function () {
            var val = $(input).val();
            if (val == oldValue) {
                return;
            }
            oldValue = val;
            var fieldset = $(input).parents("fieldset")[0];
            if ($('#' + step_id).prop('full-configs') === false){
                $('#' + step_id).prop('full-configs', true);
                $('#btn-full--' + step_id).text("Hide full configs");
            }
            if (val == "") {
                $("label", fieldset).parents("div.form-group").show();
                if ($("button.full-config-show")[0].style.display == "inline") {
                  hide_not_important_fields(this);
                }
            } else {
                $("label", fieldset).filter(function (idx, e) {
                    return $(e).text().toLowerCase().indexOf(val.toLowerCase()) == -1;
                }).parents("div.form-group").hide();
                $("label", fieldset).filter(function (idx, e) {
                    return $(e).text().toLowerCase().indexOf(val.toLowerCase()) > -1;
                }).parents("div.form-group").show();
            }
        }, 300);
    },

    saveAll: function() {
        var form = document.getElementById('form');
        var elements = form.querySelectorAll('input, textarea');
        for (var i = 0; i < elements.length; i++) {
                var id = elements[i].getAttribute('id');
                if (id) {
                    var value = elements[i].value;

                    if (elements[i].type != "checkbox") {
                        sessionStorage.setItem(id, value);
                    } else {
                        if (elements[i].checked !== undefined) {
                            sessionStorage.setItem(id, elements[i].checked);
                        }
                    }
                }
        }
    },

    submit_form: function() {

        horizon.node_groups.saveAll();
        var currentTabsArr = horizon.node_groups.currentTabs.split(';');
        var sessionStorageTabs = sessionStorage.getItem('tabs');
        if (sessionStorageTabs === null){
          sessionStorageTabs = "";
        }
        var allTabsArr = sessionStorageTabs.split(';');

        var difference = []

        for (var i = 0; i < allTabsArr.length; i++) {
            if (currentTabsArr.indexOf(allTabsArr[i]) == -1) {
                var args = allTabsArr[i].split('~');
                var plugin_name = sessionStorage.getItem("id_plugin_name");
                var hadoop_version = sessionStorage.getItem("id_hadoop_version");
                difference.push(horizon.node_groups.loadProperty(args[1], args[0], plugin_name, hadoop_version));
            }
        }
        // Before submitting form we need load all tabs, which
        // are loaded by user in a previous session
        $.when.apply($, difference).done(function () {
            $('#form').submit();
        });
    },

    loadProperty: function(process_name, step_id, plugin, hadoop_version) {
    	console.log("Load property: ", process_name, step_id, plugin, hadoop_version);
        if ($('#' + step_id).prop('loaded')) {
            return;
        } else {
            return $.get(
                    "node-group-config-step",
                    {
                        process_id: process_name,
                        hadoop_version: hadoop_version,
                        plugin_name: plugin
                    },
                    onAjaxSuccess
            ).error(function (){location.href = '/auth/login/?next=/project/data_processing/clusters/';});

        }
        function onAjaxSuccess(data) {

            horizon.node_groups.saveAll();

            var process_short_name = process_name.split(' ')[0];
            var template = horizon.node_groups.base_template.replace(/\$process_name/g, step_id);
            $('#' + step_id).html(template);

            for (var i=0; i<data.length; i++){
              data[i] = horizon.node_groups.normalise(data[i]);
              if (data[i].config_type == 'string'){
                var tmp = horizon.node_groups.string_template.replace(/\$name/g, data[i].name).
                                                              replace(/\$help_text/g, data[i].description).
                                                              replace(/\$default_value/g, data[i].default_value).
                                                              replace(/\$priority/g, data[i].priority).
                                                              replace(/\$process/g, process_short_name);

                $('#' + step_id).find('.row').find('.col-sm-12').append(tmp);
              } else
              if (data[i].config_type == 'bool'){
                var tmp = horizon.node_groups.bool_template.replace(/\$name/g, data[i].name).
                                        replace(/\$help_text/g, data[i].description).
                                        replace(/\$priority/g, data[i].priority).
                                        replace(/\$process/g, process_short_name);


                if (data[i].default_value == true){
                    tmp = tmp.replace(/\$checked/g, "checked");
                } else {
                    tmp = tmp.replace(/\$checked/g, "");
                }

                $('#' + step_id).find('.row').find('.col-sm-12').append(tmp);
              } else {
                var tmp = horizon.node_groups.number_template.replace(/\$name/g, data[i].name).
                                          replace(/\$help_text/g, data[i].description).
                                          replace(/\$default_value/g, data[i].default_value).
                                          replace(/\$priority/g, data[i].priority).
                                          replace(/\$process/g, process_short_name);

                $('#' + step_id).find('.row').find('.col-sm-12').append(tmp);
              }
            }

          $("#field-filter-" + step_id).each(function () {
             horizon.node_groups.create_auto_search(this, step_id);
          });

            //Need save to local storage opened tabs
            var tabs = sessionStorage.getItem("tabs");
            if (tabs == null) {
                tabs = '';
            }
            var step_process = step_id + '~' + process_name;
            if ((tabs.indexOf(step_process)) == -1) {
                tabs = tabs + step_process + ';';
                sessionStorage.setItem("tabs", tabs);
            }
            horizon.node_groups.currentTabs = horizon.node_groups.currentTabs + ';' + step_process;
            var form = document.getElementById('form');
            var elements = form.querySelectorAll('input, textarea');
            
            for (var i = 0; i < elements.length; i++) {
                (function (element) {
                    var id = element.getAttribute('id');
                    if (id) {
                        if (element.type != 'checkbox') {
                            var val = sessionStorage.getItem(id);
                            if (val) {
                                element.value = sessionStorage.getItem(id);
                            }
                        } else {
                            // If we haven't info about this checkbox - let pass this.
                            // In another case let:
                            var checkbox_val = sessionStorage.getItem(id);
                            if (checkbox_val != undefined){
                                try{
                                    element.prop("checked", checkbox_val);
                                } catch (err){
                                }
                                
                            }
                        }
                    }

                })(elements[i]);
            }

            $('#' + step_id).prop('loaded', true);
            $('#' + step_id).prop('full-configs', true);
            $('#btn-full--' + step_id).click();
        }
    }
}
