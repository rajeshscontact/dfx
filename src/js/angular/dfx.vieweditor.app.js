var dfxViewEditorApp = angular.module("dfxViewEditorApp", ['ngMaterial', 'ngMdIcons', 'dfxGControls', 'dfxStudioApi', 'nsPopover', 'mdPickers']);

dfxViewEditorApp.config(function($mdThemingProvider) {
    $mdThemingProvider.theme('altTheme')
        .primaryPalette('blue') // specify primary color, all
    // other color intentions will be inherited
    // from default
    $mdThemingProvider.setDefaultTheme('altTheme');
});

dfxViewEditorApp.controller("dfx_main_controller", [ '$scope', '$rootScope', '$q', '$http', '$mdDialog', '$compile', '$timeout', function($scope, $rootScope, $q, $http, $mdDialog, $compile, $timeout) {
    $rootScope.message = "Welcome to the View Editor";
    $scope.application_name = $('#dfx-view-editor-body').attr('data-application');
    $scope.view_name = $('#dfx-view-editor-body').attr('data-widget');
    $scope.view_platform = $('#dfx-view-editor-body').attr('data-platform');
    $scope.tenant_id = $('#dfx-view-editor-body').attr('data-tenantid');
    //$scope.view_category = $('#dfx_src_widget_editor').attr('data-view-cat'); //here in that moment #dfx_src_widget_editor attribute 'data-platform' is empty. That attribute takes value inside dfx_view_editor_controller.
    $scope.closed_gc_palette = false;
    $scope.gc_types = {};
    $scope.helpTree = true;
    $scope.helpForm = false;
    $scope.scopeOptionsVarNameInput = false;

    $scope.$on('keypress:83', function(onEvent, keypressEvent) {
    	alert('here');
    });

    $scope.getGCDefaultAttributes = function( type ) {
        var deferred = $q.defer();
        if ($scope.gc_types[type] != null) {
            deferred.resolve( $scope.gc_types[type] );
        } else {
            $http.get( '/gcontrols/web/' + type + '.json' ).success( function(data) {
                $scope.gc_types[type] = data;
                deferred.resolve( data );
            });
        }
        return deferred.promise;
    };

    $scope.loadView = function() {
        return '/studio/widget/editui/' + $scope.application_name + '/' + $scope.view_name + '/' + $scope.view_platform;
    };

    $scope.showHelpEditor = function(ev) {
        $(ev.srcElement).animateCss('pulse');
        var $parentScope = $scope;
        var $editorScope = angular.element(document.getElementById('dfx_src_widget_editor')).scope()
        $mdDialog.show({
            parent: angular.element(document.body),
            clickOutsideToClose:true,
            templateUrl: '/gcontrols/web/help_dialog.html',
            controller: function($scope){
                $scope.$parentScope = $parentScope;
                $scope.$editorScope = $editorScope;
                $scope.helpTree = true;
                $scope.helpForm = false;
                $scope.scopeOptionsVarNameInput = false;
                $scope.helpApiRoutesTree = false;
                $scope.showBackButton = false;
                $scope.showOkButton = false;
                $scope.help_cardForm = false;
                $scope.closeDialog = function() {
                    $mdDialog.hide();
                }
                $scope.showApiRoutesTree = function(type) {
                    $http({
                        method: 'GET',
                        url: '/studio/query/list-by-app-detailed/' + $scope.$parentScope.application_name
                    }).then(function(data) {
                        $http({
                            method: 'GET',
                            url: '/studio/query/list-by-app-detailed/__shared__'
                        }).then(function(shared_data) {
                            $scope.requestType = type;
                            $scope.picker_apiroutes = data.data.queries;
                            $scope.picker_apiroutes_cat = Object.keys($scope.picker_apiroutes);
                            $scope.shared_picker_apiroutes = shared_data.data.queries;
                            $scope.shared_picker_apiroutes_cat = Object.keys($scope.shared_picker_apiroutes);

                            $scope.helpApiRoutesTree = true;
                            $scope.helpTree = false;
                            $scope.helpForm = false;
                            $scope.scopeOptionsVarNameInput = false;
                            $scope.showBackButton = true;
                        });
                    });
                }
                $scope.selectApiRoute = function(cat, idx, route, shared) {
                    $scope.helpApiRoutesTree = false;
                    $scope.picked_api_route = route;
                    $scope.picked_api_route_instance = !shared ? $scope.picker_apiroutes[cat][idx].apiRoutes[route] : $scope.shared_picker_apiroutes[cat][idx].apiRoutes[route];
                    $scope.showBackButton = true;
                    ($scope.requestType  == 'get') ? $scope.showInputForm('getApiRoute') : $scope.showInputForm('apiroute-post');


                }
                $scope.showInputForm = function(type) {
                    $scope.helpType = type;
                    $scope.helpTree = false;

                    $scope.helpForm = true;
                    var chartsList = ['barchart','hzbarchart','piechart','donutchart','linechart','cmlinechart','areachart'];
                    if (chartsList.indexOf(type) > -1) {
                        $scope.scopeOptionsVarNameInput = true;
                    } else {
                        $scope.scopeOptionsVarNameInput = false;
                    }

                    $scope.showBackButton = true;
                    $scope.showOkButton = true;
                    if ((type === 'dialog_view') || (type === 'side_nav_view') || (type === 'bottom_sheet_view') || (type === 'show_card')) {
                        $scope.helpCardForm = true;
                        $scope.helpViewCards = $scope.$editorScope.view_cards;
                        console.log($scope.helpViewCards);
                    }
                }
                $scope.back = function() {
                    if (($scope.helpType == 'getApiRoute') || ($scope.helpType == 'apiroute-post')) {
                        $scope.helpTree = false;
                        $scope.helpForm = false;
                        $scope.scopeOptionsVarNameInput = false;
                        $scope.helpApiRoutesTree = true;
                        delete $scope.helpType;
                    } else {
                        $scope.helpCardForm = false;
                        $scope.helpTree = true;
                        $scope.helpForm = false;
                        $scope.scopeOptionsVarNameInput = false;
                        $scope.helpApiRoutesTree = false;
                        $scope.showBackButton = false;
                    }
                    $scope.showOkButton = false;
                }
                $scope.ok = function() {
                    if (($scope.helpType) && ($scope.scopeVarName)) {
                        if ($scope.helpType == 'getApiRoute') {
                            var editor_script   = $('#dfx_script_editor.CodeMirror')[0].CodeMirror;
                            var route_params = {};
                            if ($scope.picked_api_route_instance.parameters!=null) {
                                for (var idx=0; idx<$scope.picked_api_route_instance.parameters.length; idx++) {
                                    route_params[$scope.picked_api_route_instance.parameters[idx].name] = $scope.picked_api_route_instance.parameters[idx].value;
                                }
                            }
                            var script = "dfxApiServices.get( $scope, '" + $scope.picked_api_route + "', " + JSON.stringify(route_params) + ").then(function(response){\n"
                                + "\t\t$scope.$apply( function() {\n"
                                + "\t\t\t$scope." + $scope.scopeVarName + " = response.data;\n"
                                + "\t\t});\n"
                                + "\t\t}).fail(function(error){\n"
                                + "\t\t});\n";

                            editor_script.replaceSelection(script);
                        } else if ($scope.helpType == 'apiroute-post') {
                            var editor_script   = $('#dfx_script_editor.CodeMirror')[0].CodeMirror;
                            var route_params = {};
                            if ($scope.picked_api_route_instance.parameters!=null) {
                                for (var idx=0; idx<$scope.picked_api_route_instance.parameters.length; idx++) {
                                    route_params[$scope.picked_api_route_instance.parameters[idx].name] = $scope.picked_api_route_instance.parameters[idx].value;
                                }
                            }
                            var script = "dfxApiServices.post( $scope, '" + $scope.picked_api_route + "', " + JSON.stringify(route_params) + ", {}).then(function(response){\n"
                                + "\t\t$scope.$apply( function() {\n"
                                + "\t\t\t$scope." + $scope.scopeVarName + " = response.data;\n"
                                + "\t\t});\n"
                                + "\t\t}).fail(function(error){\n"
                                + "\t\t});\n";

                            editor_script.replaceSelection(script);
                        } else {
                            helpDialogScript({
                                item: $scope.helpType,
                                varName: $scope.scopeVarName,
                                optionsVarName: $scope.scopeOptionsVarName,
                                viewName: $scope.$parentScope.view_name,
                                cardName: $scope.scopeCardName
                            });
                        }
                        $mdDialog.hide();
                    }
                }
            }
        })
    }

    $scope.toggleGCPalette = function() {
        if ($scope.closed_gc_palette) {
            $('#dfx_gc_palette_title').css('display', 'inline-block');
            $('#dfx_gc_palette_toggle > a > span').attr('class', 'fa fa-angle-double-left');
            $('#dfx_visual_editor_left').css('width', '105px');
            $('#dfx_visual_editor_middle').css('left','106px');
            $('#dfx_visual_editor_workspace').css('left','106px');
            $scope.closed_gc_palette = false;
        } else {
            $('#dfx_gc_palette_title').css('display', 'none');
            $('#dfx_gc_palette_toggle > a > span').attr('class', 'fa fa-angle-double-right');
            $('#dfx_visual_editor_left').css('width', '18px');
            $('#dfx_visual_editor_middle').css('left','19px');
            $('#dfx_visual_editor_workspace').css('left','19px');
            $scope.closed_gc_palette = true;
        }
    };

    $scope.initContainers = function() {

    };

    $scope.cancelAPIRoute = function() {
        $('#dfx_picker_script').css( 'display', 'block' );
        $('#dfx_picker_api_route').css( 'display', 'none' );
        $('#dfx_picker_api_route_form').css( 'display', 'none' );
    };

    /*$scope.overrideAttribute = function(event, property) {
        if ($scope.gc_renderer!=null) {
            $scope.gc_renderer.attributes[property].status = 'overridden';
        } else {
            $scope.gc_selected.attributes[property].status = 'overridden';
        }
    };*/

}]);

dfxViewEditorApp.controller("dfx_view_editor_controller", [ '$scope', '$rootScope', '$compile', '$timeout', '$mdDialog', '$mdToast', '$mdSidenav', '$log', '$mdMedia', '$window', '$http', '$location', '$interval', 'dfxMessaging', 'dfxViews', 'dfxRendering', 'dfxGcTemplates', function($scope, $rootScope, $compile, $timeout, $mdDialog, $mdToast, $mdSidenav, $log, $mdMedia, $window, $http, $location, $interval, dfxMessaging, dfxViews, dfxRendering, dfxGcTemplates) {
    $scope.palette_visible = true;
    $scope.property_visible = true;
    $scope.design_visible = true;
    $scope.script_visible = false;
    $scope.style_visible = false;
    $scope.source_visible = false;
    $scope.view_category = $('#dfx_src_widget_editor').attr('data-view-cat');
    $scope.design_view_mode = 'Design';
    $scope.script_theme = (localStorage.getItem('DFX_script_theme')!=null) ? localStorage.getItem('DFX_script_theme') : 'monokai';
    $scope.preview_wait_icon_visible = false;

    $scope.design_devices = [
        {
            'name':     'iphone5',
            'label':    '320x568 (Apple iPhone 5)',
            'portrait' : {
                'image':  'iphone_5_320x568.png',
                'width':  '376px',
                'height': '794px',
                'padding-top': '110px',
                'padding-left': '30px',
                'padding-right': '30px',
                'padding-bottom': '120px'
            },
            'landscape': {
                'image':  'iphone_5_landscape_320x568.png',
                'width':  '794px',
                'height': '376px',
                'padding-top': '30px',
                'padding-left': '110px',
                'padding-right': '120px',
                'padding-bottom': '30px'
            }
        },
        {
            'name':     'iphone6',
            'label':    '375x667 (Apple iPhone 6)',
            'portrait' : {
                'image':  'iphone_6_375x667.png',
                'width':  '432px',
                'height': '880px',
                'padding-top': '109px',
                'padding-left': '31px',
                'padding-right': '30px',
                'padding-bottom': '109px'
            },
            'landscape': {
                'image':  'iphone_6_landscape_375x667.png',
                'width':  '880px',
                'height': '432px',
                'padding-top': '30px',
                'padding-left': '109px',
                'padding-right': '108px',
                'padding-bottom': '30px'
            }
        },
        {
            'name':     'iphone6plus',
            'label':    '414x736 (Apple iPhone 6+)',
            'portrait' : {
                'image':  'iphone_6plus_414x736.png',
                'width':  '471px',
                'height': '955px',
                'padding-top': '103px',
                'padding-left': '31px',
                'padding-right': '30px',
                'padding-bottom': '120px'
            },
            'landscape': {
                'image':  'iphone_6plus_landscape_414x736.png',
                'width':  '955px',
                'height': '471px',
                'padding-top': '30px',
                'padding-left': '103px',
                'padding-right': '120px',
                'padding-bottom': '30px'
            }
        }
    ];
    $scope.design_selected_device = $scope.design_devices[1];
    $scope.design_device_orientation = 'Portrait';

    $scope.toggleRight = function() {
        $scope.property_visible = !$scope.property_visible;
        if ($scope.property_visible) {
            $('#dfx-ve-toggle-property-icon').removeClass('fa-angle-double-left');
            $('#dfx-ve-toggle-property-icon').addClass('fa-angle-double-right');
            $('#dfx-ve-property-title').removeClass('dfx-ve-property-title-collapsed');
            $('#dfx-ve-property-title-text').removeClass('dfx-ve-property-title-text-collapsed');
        } else {
            $('#dfx-ve-property-title').addClass('dfx-ve-property-title-collapsed');
            $('#dfx-ve-property-title-text').addClass('dfx-ve-property-title-text-collapsed');
            $('#dfx-ve-toggle-property-icon').addClass('fa-angle-double-left');
            $('#dfx-ve-toggle-property-icon').removeClass('fa-angle-double-right');
        }
    };
    $scope.changeViewMode = function (view_mode) {
        if (view_mode=='design') {
            $scope.design_view_mode = 'Design';
            $scope.showDesign();
        } else if (view_mode=='script') {
            $scope.design_view_mode = 'Script';
            $scope.showScript();
        } else if (view_mode=='style') {
            $scope.design_view_mode = 'Style';
            $scope.showStyle();
        } else if (view_mode=='source') {
            $scope.design_view_mode = 'Source';
            $scope.showSource();
        }
    };
    $scope.changeScriptTheme = function (script_theme) {
        $scope.script_theme = script_theme;
        localStorage.setItem('DFX_script_theme', script_theme);
        var editor = $('#dfx_src_editor')[0].CodeMirror;
        editor.setOption('theme', $scope.script_theme);
        editor = $('#dfx_styles_editor')[0].CodeMirror;
        editor.setOption('theme', $scope.script_theme);
        editor = $('#dfx_script_editor')[0].CodeMirror;
        editor.setOption('theme', $scope.script_theme);
    };
    $scope.showDesign = function() {
        $scope.design_visible = true;
        $scope.script_visible = false;
        $scope.style_visible = false;
        $scope.source_visible = false;
        $('#dfx_styles_editor').css('display', 'none');
        $('#dfx_src_editor').css('display', 'none');
        $('#dfx_script_editor').css('display', 'none');
        $('.dfx-ve-toolbar-button').removeClass('dfx-ve-toolbar-button-selected');
        $('.dfx-ve-toolbar-button-design').addClass('dfx-ve-toolbar-button-selected');
    };
    $scope.showScript = function() {
        $scope.design_visible = false;
        $scope.script_visible = true;
        $scope.style_visible = false;
        $scope.source_visible = false;
        $('#dfx_styles_editor').css('display', 'none');
        $('#dfx_src_editor').css('display', 'none');
        $('#dfx_script_editor').css('display', 'block');
        $('.dfx-ve-toolbar-button').removeClass('dfx-ve-toolbar-button-selected');
        $('.dfx-ve-toolbar-button-script').addClass('dfx-ve-toolbar-button-selected');
		var editor = $('#dfx_script_editor')[0].CodeMirror;
		editor.focus();
    };
    $scope.showStyle = function() {
        $scope.design_visible = false;
        $scope.style_visible = true;
        $scope.script_visible = false;
        $scope.source_visible = false;
        $('#dfx_script_editor').css('display', 'none');
        $('#dfx_src_editor').css('display', 'none');
        $('#dfx_styles_editor').css('display', 'block');
        $('.dfx-ve-toolbar-button').removeClass('dfx-ve-toolbar-button-selected');
        $('.dfx-ve-toolbar-button-styles').addClass('dfx-ve-toolbar-button-selected');
		var editor = $('#dfx_styles_editor')[0].CodeMirror;
		editor.focus();
    };
    $scope.showSource = function() {
        var editor = $('#dfx_src_editor')[0].CodeMirror;

        for (var key in $scope.gc_instances) {
            var component = angular.copy($scope.gc_instances[key]);
            for (attribute in component.attributes) {
                if (component.attributes[attribute].status!='overridden') {
                    delete component.attributes[attribute];
                }
            }
            var widget_definition = JSON.parse(editor.getValue());
            DfxVisualBuilder.findComponentAndUpdateAttributes(component.id, widget_definition.definition, component.attributes, $scope.view_card_selected, false);
            editor.setValue(JSON.stringify(widget_definition, null, '\t'));
            editor.scrollTo(0, 0);
            editor.refresh();
			editor.focus();
        }

        $scope.design_visible = false;
        $scope.source_visible = true;
        $scope.script_visible = false;
        $scope.style_visible = false;
        $('#dfx_styles_editor').css('display', 'none');
        $('#dfx_script_editor').css('display', 'none');
        $('#dfx_src_editor').css('display', 'block');
        $('.dfx-ve-toolbar-button').removeClass('dfx-ve-toolbar-button-selected');
        $('.dfx-ve-toolbar-button-source').addClass('dfx-ve-toolbar-button-selected');

        editor.refresh();
    };

    $scope.refreshDevice = function() {
        var dfx_ve_platform = $('div[dfx-ve-platform]');
        if ($scope.design_device_orientation=='Portrait') {
            dfx_ve_platform.css('width', $scope.design_selected_device.portrait['width']);
            dfx_ve_platform.css('height', $scope.design_selected_device.portrait['height']);
            dfx_ve_platform.css('padding-top', $scope.design_selected_device.portrait['padding-top']);
            dfx_ve_platform.css('padding-left', $scope.design_selected_device.portrait['padding-left']);
            dfx_ve_platform.css('padding-right', $scope.design_selected_device.portrait['padding-right']);
            dfx_ve_platform.css('padding-bottom', $scope.design_selected_device.portrait['padding-bottom']);
            dfx_ve_platform.css( 'background', 'url(/images/' + $scope.design_selected_device.portrait['image'] + ') no-repeat' );
        } else {
            dfx_ve_platform.css('width', $scope.design_selected_device.landscape['width']);
            dfx_ve_platform.css('height', $scope.design_selected_device.landscape['height']);
            dfx_ve_platform.css('padding-top', $scope.design_selected_device.landscape['padding-top']);
            dfx_ve_platform.css('padding-left', $scope.design_selected_device.landscape['padding-left']);
            dfx_ve_platform.css('padding-right', $scope.design_selected_device.landscape['padding-right']);
            dfx_ve_platform.css('padding-bottom', $scope.design_selected_device.landscape['padding-bottom']);
            dfx_ve_platform.css( 'background', 'url(/images/' + $scope.design_selected_device.landscape['image'] + ') no-repeat' );
        }
    };

    $scope.changeDevice = function(index) {
        $scope.design_selected_device = $scope.design_devices[index];
        $scope.refreshDevice();
    };

    $scope.changeDeviceOrientation = function() {
        $scope.design_device_orientation = ($scope.design_device_orientation=='Portrait') ? 'Landscape' : 'Portrait';
        $scope.refreshDevice();
    };

    $scope.searchScript = function(ev) {
        $(ev.srcElement).animateCss('pulse');
        var editor = $('#dfx_script_editor')[0].CodeMirror;
        editor.execCommand('find');
    };

    $scope.replaceScript = function(ev) {
        $(ev.srcElement).animateCss('pulse');
        var editor = $('#dfx_script_editor')[0].CodeMirror;
        editor.execCommand('replace');
    };

    $scope.configureDependenciesScript = function(ev) {
        $(ev.srcElement).animateCss('pulse');
        var parentEl = angular.element(document.body);
        $mdDialog.show({
            parent: parentEl,
            targetEvent: ev,
            template:
            '<md-dialog aria-label="List dialog">' +
            '   <md-toolbar>' +
            '       <div class="md-toolbar-tools">' +
            '           <h2>Dependency Injection</h2>' +
            '       </div>' +
            '   </md-toolbar>' +
            '   <md-dialog-content style="width:500px;min-height:400px;padding:20px">'+
            '           <div ng-repeat="dependency in dependencies">'+
            '               <md-checkbox ng-checked="dependencyExists(dependency, selectedDependencies)" ng-click="toggleDependency(dependency, selectedDependencies)">' +
            '                   {{dependency}}' +
            '               </md-checkbox>' +
            '           </div>'+
            '   </md-dialog-content>' +
            '   <md-dialog-actions>' +
            '       <md-button ng-click="saveConfigureDependenciesScriptDialog()" class="md-primary">' +
            '           Save' +
            '       </md-button>' +
            '       <md-button ng-click="closeConfigureDependenciesScriptDialog()" class="md-primary">' +
            '           Cancel' +
            '       </md-button>' +
            '   </md-dialog-actions>' +
            '</md-dialog>',
            locals: {
                dependencies: $scope.dependencies
            },
            controller: DialogController
        });
        function DialogController($scope, $mdDialog) {
            $scope.dependencies = ['$rootScope','$scope', 'dfxApiServices', 'dfxDialog', 'dfxSidenav', 'dfxBottomSheet', 'dfxChangeCard', 'dfxPubSub'];
            $scope.selectedDependencies = [];
            $scope.additionalDependencies = [];

            var regexDependencies = /(controller(.*?)\[)(.*)(?=function)/;
            var regexDependenciesArgs = /(function(.*?))(.*)(?=\{)/;
            var editor_script = $('#dfx_script_editor.CodeMirror')[0].CodeMirror;
            var text_script = editor_script.getValue();

            var m;

            if ((m = regexDependencies.exec(text_script)) !== null) {
                if (m.index === regexDependencies.lastIndex) {
                    regexDependencies.lastIndex++;
                }
                var arr_dependencies = m[3].split(',');
                for (dependency in arr_dependencies) {
                    if (isNaN(dependency)) { continue; }
                    if (arr_dependencies[dependency].trim() != '') {
                        var current_dependency =
                            arr_dependencies[dependency].substring(
                                arr_dependencies[dependency].indexOf('\'')+1,
                                arr_dependencies[dependency].length-1
                            ).trim();
                        if ($scope.dependencies.indexOf(current_dependency)>-1) {
                            $scope.selectedDependencies.push( current_dependency );
                        } else {
                            $scope.additionalDependencies.push( current_dependency );
                        }
                    }
                }
            }

            $scope.dependencyExists = function(item, list) {
                return list.indexOf(item) > -1;
            };

            $scope.toggleDependency = function(item, list) {
                var idx = list.indexOf(item);
                if (idx > -1) {
                    list.splice(idx, 1);
                }
                else {
                    list.push(item);
                }
            };

            $scope.saveConfigureDependenciesScriptDialog = function() {
                var text_dependencies = '';
                var text_dependencies_args = '';
                $scope.selectedDependencies = $scope.selectedDependencies.concat($scope.additionalDependencies);
                for (var i=0; i<$scope.selectedDependencies.length; i++) {
                    text_dependencies += '\'' + $scope.selectedDependencies[i] + '\', ';
                    text_dependencies_args += $scope.selectedDependencies[i] + ', ';
                }
                text_dependencies_args = text_dependencies_args.substr( 0, text_dependencies_args.length-2 );
                var new_script = text_script.replace(regexDependencies, m[1 ] + text_dependencies);

                new_script = new_script.replace( regexDependenciesArgs, 'function ( ' + text_dependencies_args + ' ) ' );

                editor_script.setValue(new_script);
                $mdDialog.hide();
            }

            $scope.closeConfigureDependenciesScriptDialog = function() {
                $mdDialog.hide();
            }
        }
    };

    $scope.unselectComponent = function() {
        if ($scope.gc_selected != null) {
            $('#'+$scope.gc_selected.id).css('border', '0px');
            $scope.gc_selected = null;
        }
    };

    $scope.addCard = function(ev) {
        $(ev.srcElement).animateCss('pulse');
        $mdDialog.show({
            controller: DialogController,
            templateUrl: '/gcontrols/web/cards_add.html',
            parent: angular.element(document.body),
            targetEvent: ev
        })
        .then(function(card) {
            var editor = $('#dfx_src_editor')[0].CodeMirror;
            var widget_definition = JSON.parse(editor.getValue());
            widget_definition.definition[card.name] = [
                {
                    id:         Math.floor(Math.random() * 1000),
                    type:       "panel",
                    attributes: {
                        "name": { "value": "pnlPanel1", "status": "overridden" }
                    },
                    children:   []
                }
            ];
            editor.setValue(JSON.stringify(widget_definition, null, '\t'), 0);
            $scope.view_cards.push({'name':card.name});
            $timeout(function() {
                $scope.view_card_select_index = $scope.view_cards.length-1;
                DfxViewEditorSettings.fitRulerPosition();
            });
        }, function() {
            // do nothing
        });

        function DialogController($scope, $mdDialog) {
            $scope.card = {"name":""};
            $scope.addCardConfirm = function(answer) {
                $mdDialog.hide($scope.card);
            };

            $scope.addCardCancel = function() {
                $mdDialog.cancel();
            };
        }
    };

    $scope.removeCard = function(ev) {
        $(ev.srcElement).animateCss('pulse');
        if ($scope.view_card_select_index>0) {
            var confirm = $mdDialog.confirm()
                .title('Remove Card')
                .textContent('Do you confirm you want to remove the card named ' + $scope.view_card_selected + '?')
                .ariaLabel('Remove Card')
                .targetEvent(ev)
                .ok('OK')
                .cancel('Cancel');
            $mdDialog.show(confirm).then(function() {
                var editor = $('#dfx_src_editor')[0].CodeMirror;
                var widget_definition = JSON.parse(editor.getValue());
                delete widget_definition.definition[$scope.view_card_selected];
                editor.setValue(JSON.stringify(widget_definition, null, '\t'), 0);
                for (var i=0; i<$scope.view_cards.length; i++) {
                    if ($scope.view_cards[i].name==$scope.view_card_selected) {
                        $scope.view_cards.splice(i, 1);
                        break;
                    }
                }
                $scope.gc_instances = {};
                $timeout(function() {
                    $scope.view_card_select_index = 0;
                });
            }, function() {
              // do nothing
            });
        } else {
            $mdDialog.show(
                $mdDialog.alert()
                    .clickOutsideToClose(true)
                    .title('Remove Card')
                    .textContent('You cannot remove the default card.')
                    .ariaLabel('Remove Card')
                    .ok('OK')
                    .targetEvent(ev)
            );
        }
    };

    $scope.toggleCard = function(card) {
        var editor = $('#dfx_src_editor')[0].CodeMirror;
        var widget_definition = JSON.parse(editor.getValue());

        if ( widget_definition.definition[$scope.view_card_selected] ) {
            widget_definition.definition[$scope.view_card_selected][0].animation = $scope.view_card_animation;
        }

        for (var key in $scope.gc_instances) {
            var component = angular.copy($scope.gc_instances[key]);
            for (attribute in component.attributes) {
                if (component.attributes[attribute].status!='overridden') {
                    delete component.attributes[attribute];
                }
            }
            DfxVisualBuilder.findComponentAndUpdateAttributes(component.id, widget_definition.definition, component.attributes, $scope.view_card_selected, false);
            editor.setValue(JSON.stringify(widget_definition, null, '\t'), 0);
        }

        $scope.gc_instances = {};
        $('#dfx_visual_editor_workspace_'+$scope.view_card_selected).empty();
        $scope.view_card_animation = (widget_definition.definition[card][0].animation) ? widget_definition.definition[card][0].animation : {
          in: 'fadeIn',
          out: 'slideOutLeft'
        };
        $scope.view_card_selected = card;
        $scope.unselectComponent();
        $scope.addComponents(widget_definition.definition, null, card);
    };

    $scope.exitViewEditor = function(ev) {
        $(ev.srcElement).animateCss('pulse');
        var confirm = $mdDialog.confirm()
          .title('Exit')
          .textContent('Do you confirm you want to exit the editor?')
          .ariaLabel('Exit')
          .targetEvent(ev)
          .ok('OK')
          .cancel('Cancel');
        $mdDialog.show(confirm).then(function() {
          $window.close();
        }, function() {
          // do nothing
        });
    };

    $scope.updateAttributes = function() {
        var editor = $('#dfx_src_editor.CodeMirror')[0].CodeMirror;
        for (var key in $scope.gc_instances) {
            var component = angular.copy($scope.gc_instances[key]);
            for (attribute in component.attributes) {
                if (component.attributes[attribute].status != 'overridden') {
                    delete component.attributes[attribute];
                }
            }
            var widget_definition = JSON.parse(editor.getValue());
            DfxVisualBuilder.findComponentAndUpdateAttributes(component.id, widget_definition.definition, component.attributes, $scope.view_card_selected, false);
            editor.setValue(JSON.stringify(widget_definition, null, '\t'), 0);
        }
    };


    $scope.saveView = function(event) {
		if (event!=null) {
        	$(event.srcElement).animateCss('pulse');
		}
        /*DfxStudio.updateWidgetSource({
            widgetName:'#{widget.name}',
            category:'#{widget.category}',
            applicationName: '#{widget.application}'});*/
        var editor = $('#dfx_src_editor.CodeMirror')[0].CodeMirror;
        for (var key in $scope.gc_instances) {
            var component = angular.copy($scope.gc_instances[key]);
            for (attribute in component.attributes) {
                if (component.attributes[attribute].status!='overridden') {
                    delete component.attributes[attribute];
                }
            }
            var widget_definition = JSON.parse(editor.getValue());
            widget_definition.definition[$scope.view_card_selected][0].animation = $scope.view_card_animation;
            DfxVisualBuilder.findComponentAndUpdateAttributes(component.id, widget_definition.definition, component.attributes, $scope.view_card_selected, false);
            editor.setValue(JSON.stringify(widget_definition, null, '\t'), 0);
        }
        var editor_script = $('#dfx_script_editor.CodeMirror')[0].CodeMirror;
        var editor_styles = $('#dfx_styles_editor.CodeMirror')[0].CodeMirror;

        var view_condensed_src = JSON.parse(editor.getValue());

        var obj           = {
            src:         JSON.stringify(view_condensed_src),
            src_script:  editor_script.getValue(),
            src_styles:  editor_styles.getValue(),
            application: $scope.application_name,
            platform:    $scope.view_platform,
            category:    $scope.view_category
        };

        // Compile & Update Widget Cache
        window.localStorage.setItem( 'dfx_' + $scope.view_name, editor.getValue() );
		dfxRendering.render($scope, editor.getValue()).then( function(data) {
			for (var card_name in data) {
				window.localStorage.setItem('DFX_view_compiled_'+$scope.view_name+'_'+card_name, data[card_name]);
			}
        });

        $http({
            method: 'POST',
            url: '/studio/widget/update/' + $scope.view_name ,
            data: {
                change: obj
            }
        }).then(function (data) {
            $mdToast.show(
              $mdToast.simple()
                .textContent(data.data.data)
                .theme('success-toast')
                .position('top right')
                .hideDelay(3000)
            );
        },function (err) {
            $mdToast.show(
              $mdToast.simple()
                .textContent(JSON.parse(err.responseText).error.message)
                .position('top right')
                .hideDelay(3000)
            );
        });

    };

    $scope.openPreview = function(event) {
        // delete dfx_app_token cookie
        document.cookie = 'dfx_app_token=;expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        $(event.srcElement).animateCss('pulse');

		var editor = $('#dfx_src_editor.CodeMirror')[0].CodeMirror;
		window.localStorage.setItem( 'dfx_' + $scope.view_name, editor.getValue() );
        for (var key in $scope.gc_instances) {
            var component = angular.copy($scope.gc_instances[key]);
            for (attribute in component.attributes) {
                if (component.attributes[attribute].status!='overridden') {
                    delete component.attributes[attribute];
                }
            }
            var widget_definition = JSON.parse(editor.getValue());
            widget_definition.definition[$scope.view_card_selected][0].animation = $scope.view_card_animation;
            DfxVisualBuilder.findComponentAndUpdateAttributes(component.id, widget_definition.definition, component.attributes, $scope.view_card_selected, false);
            editor.setValue(JSON.stringify(widget_definition, null, '\t'), 0);
        }
		dfxRendering.render($scope, editor.getValue()).then( function(data) {
			for (var card_name in data) {
				window.localStorage.setItem('DFX_view_compiled_'+$scope.view_name+'_'+card_name, data[card_name]);
			}
            $window.open('/studio/widget/' + $scope.view_platform + '/preview/' + $scope.application_name + '/' + $scope.view_name + '/desktop', '_blank');
			//$window.open('/studio/widget/' + $scope.view_platform + '/preview-auth/' + $scope.application_name + '/' + $scope.view_name + '/' + $scope.view_platform + '/desktop', '_blank');
        });
    };

    $scope.openPreviewSettings = function(ev) {
        var parentEl = angular.element(document.body);
        $mdDialog.show({
            parent: parentEl,
            targetEvent: ev,
            template:
            '<md-dialog aria-label="Preview Settings">' +
            '   <md-toolbar>' +
            '       <div class="md-toolbar-tools">' +
            '           <h2>Preview Settings</h2>' +
            '       </div>' +
            '   </md-toolbar>' +
            '   <md-dialog-content style="width:500px;min-height:400px;padding:20px">'+
            '       <h4 style="padding-bottom:10px">Login credentials:</h4>' +
            '       <form layout="column">' +
            '           <md-input-container>' +
            '               <label>User ID</label>' +
            '               <input name="userid" ng-model="dfx_ve_login_userid" type="text" />' +
            '           </md-input-container>' +
            '           <md-input-container>' +
            '               <label>Password</label>' +
            '               <input name="password" ng-model="dfx_ve_login_password" type="password" />' +
            '           </md-input-container>' +
            '       </form>' +
            '   </md-dialog-content>' +
            '   <md-dialog-actions>' +
            '       <md-button ng-click="savePreviewSettings()" class="md-primary">' +
            '           Save' +
            '       </md-button>' +
            '       <md-button ng-click="clearPreviewSettings()" class="md-primary">' +
            '           Clear' +
            '       </md-button>' +
            '       <md-button ng-click="closePreviewSettingsDialog()" class="md-primary">' +
            '           Cancel' +
            '       </md-button>' +
            '   </md-dialog-actions>' +
            '</md-dialog>',
            locals: {
            },
            controller: DialogController
        });
        function DialogController($scope, $mdDialog) {
            $scope.dfx_ve_login_userid = localStorage.getItem( 'DFX_ve_login_userid' )==null ? '' : localStorage.getItem( 'DFX_ve_login_userid' );
            $scope.dfx_ve_login_password = localStorage.getItem( 'DFX_ve_login_password' )==null ? '' : localStorage.getItem( 'DFX_ve_login_password' );

            $scope.savePreviewSettings = function() {
                localStorage.setItem( 'DFX_ve_login_userid', $scope.dfx_ve_login_userid );
                localStorage.setItem( 'DFX_ve_login_password', $scope.dfx_ve_login_password );
                $mdDialog.hide();
            }

            $scope.clearPreviewSettings = function() {
                localStorage.removeItem( 'DFX_app_tokens' );
                localStorage.removeItem( 'DFX_ve_login_userid' );
                localStorage.removeItem( 'DFX_ve_login_password' );
                $scope.dfx_ve_login_userid = '';
                $scope.dfx_ve_login_password = '';
                dfxDialog.showMessage( 'Preview Settings Cleared' );
            }

            $scope.closePreviewSettingsDialog = function() {
                $mdDialog.hide();
            }
        }
    };

    $scope.openPreviewInPage = function() {
        $timeout(function(){
            $mdDialog.show({
                scope: $scope.$new(),
                parent: angular.element(document.body),
                clickOutsideToClose:true,
                templateUrl: '/studio/studioviews/page_preview_dialog.html',
                controller: function(){
                    $http({
                        method: 'POST',
                        url: '/studio/screen/getByView',
                        data : {
                            viewName : $scope.view_name,
                            applicationName : $scope.application_name
                        }

                    }).then(function(data) {
                        if (!window.localStorage.getItem('pagePreviewName')) {
                            $scope.selectedPage = {value : data.data.data[0] ? data.data.data[0].name : null};
                        } else {
                            $scope.selectedPage =  {value : window.localStorage.getItem('pagePreviewName') || null};
                        }
                        $scope.pagesArray = data.data.data;
                    },function(err){
                        dfxMessaging.showWarning(err);
                    });
                    $scope.closeDialog = function(){
                        $mdDialog.hide();
                    }
                    $scope.show = function() {
                        window.localStorage.setItem('pagePreviewName', $scope.selectedPage.value);
                        $scope.preview_wait_icon_visible = true;
                        $mdDialog.hide();

                        $http({
                            method : 'GET',
                            url : '/studio/screen/preview/' + $scope.application_name + '/' + $scope.selectedPage.value + '/' + $scope.view_platform
                        }).then(function(response){
                                $scope.preview_wait_icon_visible = false;
                                if (response.data.indexOf('http') > -1) {
                                    $window.open(response.data, '_blank');
                                } else {
                                    dfxMessaging.showWarning(response.data);
                                }
                            },function(err){
                                $scope.preview_wait_icon_visible = false;
                                dfxMessaging.showWarning("Something went wrong. See server logs for more details");
                            })
                    }
                }
            });
        }, 0);
    };


    $scope.compileView = function(event) {
		var editor = $('#dfx_src_editor.CodeMirror')[0].CodeMirror;
        for (var key in $scope.gc_instances) {
            var component = angular.copy($scope.gc_instances[key]);
            for (attribute in component.attributes) {
                if (component.attributes[attribute].status!='overridden') {
                    delete component.attributes[attribute];
                }
            }
            var widget_definition = JSON.parse(editor.getValue());
            widget_definition.definition[$scope.view_card_selected][0].animation = $scope.view_card_animation;
            DfxVisualBuilder.findComponentAndUpdateAttributes(component.id, widget_definition.definition, component.attributes, $scope.view_card_selected, false);
            editor.setValue(JSON.stringify(widget_definition, null, '\t'), 0);
        }
		dfxRendering.render($scope, editor.getValue()).then( function(data) {
			for (var card_name in data) {
				window.localStorage.setItem('DFX_view_compiled_'+$scope.view_name+'_'+card_name, data[card_name]);
			}
        });
    }
    $scope.exportView = function(event){
        dfxViews.getViewZip($scope, $scope.application_name, $scope.view_name, $scope.view_platform).then(function(data){
            var view_zip_link = '/studio/widget/download/' + $scope.view_name + '?path=' + data.data.data;
            $window.open( view_zip_link, '_blank' );
        });
    }

    // Facade for view workspace settings - START
    DfxViewEditorSettings.init($scope, $compile, $interval);

    $scope.loadViewSettingsMenu = function($event) {
        DfxViewEditorSettings.loadViewSettingsMenu($scope, $compile, $event);
    };
    $scope.closeViewSettingsMenu = function() {
        DfxViewEditorSettings.closeViewSettingsMenu();
    };
    $scope.setWorkspaceSize = function($event) {
        DfxViewEditorSettings.setWorkspaceSize();
    };
    $scope.changeCanvasSize = function($event) {
        DfxViewEditorSettings.changeCanvasSize($scope, $mdDialog, $event);
    };
    $scope.toggleRuler = function($event) {
        DfxViewEditorSettings.toggleRuler();
    };
    $scope.togglePanel = function(panel_id) {
        DfxViewEditorSettings.togglePanel(panel_id);
    };
    $scope.showGcTemplatesPanel = function() {
        DfxViewEditorSettings.showGcTemplatesPanel();
    };
    $scope.detachOrAttachPanel = function(panel_id) {
        DfxViewEditorSettings.detachOrAttachPanel(panel_id);
    };
    $scope.minimizeOrMaximizePanel = function(panel_id) {
        DfxViewEditorSettings.minimizeOrMaximizePanel(panel_id);
    };
    $scope.closePanel = function(panel_id) {
        DfxViewEditorSettings.closePanel(panel_id);
    };
    // Facade for view workspace settings - END

    var platform = $('#dfx_visual_editor').attr('platform');
    $('.dfx_visual_editor_gc_cat_item').empty();

    // Initialize GC Palette
    $scope.palette = {
        'basic': {
            'statictext': {'default_name':'txtText', 'flex':'false'},
            'button': {'default_name':'btnButton', 'flex':'true'},
            'icon': {'default_name':'icoIcon', 'flex':'false'},
            'image': {'default_name':'imgImage', 'flex':'false'},
            'html': {'default_name':'htHtml', 'flex':'true'},
            'carousel': {'default_name':'crsCarousel', 'flex':'true'},
            'googlemap': {'default_name':'googleMap', 'flex':'true'},
            'treeview': {'default_name':'trvTreeView', 'flex':'true'}
        },
        'input': {
            'input': {'default_name':'inpInput', 'flex':'true'},
            'textarea': {'default_name':'txtTextarea', 'flex':'true'},
            'datepicker': {'default_name':'dtField', 'flex':'true'},
            'select': {'default_name':'selSelect', 'flex':'true'},
            'slider': {'default_name':'sldSlider', 'flex':'true'},
            'knob': {'default_name':'knbKnob', 'flex':'false'},
            'chips': {'default_name':'chpChips', 'flex':'true'},
            'rating': {'default_name':'rtRating', 'flex':'false'},
            'richtext': {'default_name':'rchText', 'flex':'true'},
            'json': {'default_name':'jsnJson', 'flex':'true'},
            'progressbar': {'default_name':'progressBar', 'flex':'true'}
        },
        'menu': {
            'fab': {'default_name':'fbFab', 'flex':'false'},
            'iconbar': {'default_name':'iconBar', 'flex':'false'},
            'treemenu': {'default_name':'trMenu', 'flex':'false'},
            'horizontalmenu': {'default_name':'hrztMenu', 'flex':'true'}
        },
        'selection': {
            'radio': {'default_name':'rdRadio', 'flex':'false'},
            'checkbox': {'default_name':'chkCheckbox', 'flex':'false'},
            'switch': {'default_name':'swtSwitch', 'flex':'false'},
            'list': {'default_name':'sltList', 'flex':'true'}
        },
        'table': {
            'datatable': {'default_name':'dtblDatatable', 'flex':'true'}
        },
        'chart': {
            'barchart': {'default_name':'barChart', 'flex':'false'},
            'hzbarchart': {'default_name':'hzBarChart', 'flex':'false'},
            'piechart': {'default_name':'pieChart', 'flex':'false'},
            'donutchart': {'default_name':'donutChart', 'flex':'false'},
            'linechart': {'default_name':'lineChart', 'flex':'false'},
            'cmlinechart': {'default_name':'cmLineChart', 'flex':'false'},
            'areachart': {'default_name':'areaChart', 'flex':'false'}
        },
        'layout': {
            'panel': {'default_name':'pnlPanel', 'flex':'true'},
            'tabs': {'default_name':'tbTabs', 'flex':'true'},
            'wizard': {'default_name':'wzrdWizard', 'flex':'true'}
        }
    }

    if ($('body').attr('dfx-load-google-maps') === 'false') {
        delete $scope.palette.basic.googlemap;
    }
    var item_fragment = '';
    var comp_idx = 0;

    for (var cat in $scope.palette) {
        for (var gc in $scope.palette[cat]) {
            // Add GC to GC Palette
            item_fragment = '<li class="dfx_visual_editor_draggable dfx_visual_editor_gc_cat_item_draggable dfx-ve-palette-icon-li" gc-cat="' + cat + '" gc-type="' + gc + '" gc-flex="' + $scope.palette[cat][gc].flex + '" style="position:relative;">' +
                '<img id="dfx_ve_palette_icon_' + gc + '" class="dfx-ve-palette-icon" src="/images/vb/icons/' + cat + '_' + gc + '.png" title="' + gc + '" gc-cat="' + cat + '" gc-type="' + gc + '"/>' +
                '</li>';
            $('ul[gc-cat=' + cat + ']').append(item_fragment);

            // Add GC to GC Template popup menu
            item_fragment = '<li class="dfx-ve-palette-icon-li" gc-cat="' + cat + '" gc-type="' + gc + '" gc-flex="' + $scope.palette[cat][gc].flex + '" style="position:relative;padding:2px;">' +
                '<img id="dfx_ve_gc_template_icon_' + gc + '" class="dfx-ve-palette-icon" src="/images/vb/icons/' + cat + '_' + gc + '.png" title="' + gc + '" gc-cat="' + cat + '" gc-type="' + gc + '"/>' +
                '</li>';
            $('ul[gc-template-cat=' + cat + ']').append(item_fragment);
        }
    }

    // Initialize Graphical Controls
    // gc_instances     List of Graphical Controls
    // gc_selected      Current selected Graphical Control
    $scope.gc_instances = {};
    $scope.view_cards = [];
    $scope.view_card_selected = 'default';
    $scope.view_card_select_index = -1;
    $scope.view_card_animation = {
      in: 'fadeIn',
      out: 'slideOutLeft'
    }
    $scope.animation_in_list = ['bounce','flash','pulse','rubberBand','shake', 'headShake', 'swing', 'tada', 'wobble', 'jello', 'bounceIn', 'bounceInUp', 'bounceInDown',
      'bounceInLeft', 'bounceInRight', 'fadeIn', 'fadeInDown', 'fadeInDownBig', 'fadeInLeft',
      'fadeInLeftBig', 'fadeInRight', 'fadeInRightBig', 'fadeInUp', 'fadeInUpBig', 'flipInX', 'flipInY', 'lightSpeedIn', 'rotateIn', 'rotateInDownLeft',
      'rotateInDownRight', 'rotateInUpLeft', 'rotateInUpRight', 'hinge',
      'rollIn', 'zoomIn', 'zoomInDown', 'zoomInLeft', 'zoomInRight', 'zoomInUp', 'slideInDown',
      'slideInLeft', 'slideInRight', 'slideInUp' ];

    $scope.animation_out_list = ['bounce','flash','pulse','rubberBand','shake', 'headShake', 'swing', 'tada', 'wobble', 'jello','bounceOut', 'bounceOutDown', 'bounceOutLeft',
      'bounceOutRight', 'bounceOutUp', 'fadeOut', 'fadeOutDown', 'fadeOutDownBig', 'fadeOutLeft', 'fadeOutLeftBig', 'fadeOutRight',
      'fadeOutRightBig', 'fadeOutUp', 'fadeOutUpBig', 'flipOutX', 'flipOutY', 'lightSpeedOut', 'rotateOut', 'rotateOutDownLeft', 'rotateOutDownRight', 'rotateOutUpLeft',
      'rotateOutUpRight', 'hinge', 'rollOut', 'zoomOut', 'zoomOutDown', 'zoomOutLeft', 'zoomOutRight', 'zoomOutUp', 'slideOutDown', 'slideOutLeft', 'slideOutRight', 'slideOutUp' ];

    $scope.$watch('view_card_select_index', function(current, old){
        if (current!=old) {
            $scope.toggleCard( $scope.view_cards[current].name );
        }
    });

    $scope.swapContainerDown = function(component_id, index, tabNumber){
        var editor = $('#dfx_src_editor')[0].CodeMirror;
        var widget_definition = JSON.parse(editor.getValue());
        $scope.findComponentAndUpdateContainerDown(component_id, widget_definition.definition, $scope.view_card_selected, false, index, tabNumber);
        editor.setValue(JSON.stringify(widget_definition, null, '\t'), 0);
    };

    $scope.swapContainerRight = function(component_id, index, rowIndex, tabNumber){
        var editor = $('#dfx_src_editor')[0].CodeMirror;
        var widget_definition = JSON.parse(editor.getValue());
        $scope.findComponentAndUpdateContainerRight(component_id, widget_definition.definition, $scope.view_card_selected, false, index, rowIndex, tabNumber);
        editor.setValue(JSON.stringify(widget_definition, null, '\t'), 0);
    };

    $scope.swapContainerUp = function(component_id, index, tabNumber){
        var editor = $('#dfx_src_editor')[0].CodeMirror;
        var widget_definition = JSON.parse(editor.getValue());
        $scope.findComponentAndUpdateContainerUp(component_id, widget_definition.definition, $scope.view_card_selected, false, index, tabNumber);
        editor.setValue(JSON.stringify(widget_definition, null, '\t'), 0);
    };

    $scope.swapContainerLeft = function(component_id, index, rowIndex, tabNumber){
        var editor = $('#dfx_src_editor')[0].CodeMirror;
        var widget_definition = JSON.parse(editor.getValue());
        $scope.findComponentAndUpdateContainerLeft(component_id, widget_definition.definition, $scope.view_card_selected, false, index, rowIndex, tabNumber);
        editor.setValue(JSON.stringify(widget_definition, null, '\t'), 0);
    };

    $scope.findComponentAndUpdateContainerDown = function (component_id, parent_definition, card, found_it, index, tabNumber) {
        var idx = 0, child_idx = 0;
        var ref_parent_definition = (card!=null) ? parent_definition[card] : parent_definition;
        if (!found_it) {
            for (idx = 0; idx < ref_parent_definition.length; idx++) {
                if (ref_parent_definition[idx].id == component_id) {
                    found_it= true;
                    var g_controls = ref_parent_definition[idx].children;
                    for(var i=0; i < g_controls.length; i++){
                        var arr = g_controls[i].container.split('_');
                        if(parseInt(arr[1]) === tabNumber){
                            if(parseInt(arr[3]) === index){
                                arr[3] = index + 1;
                            }else if(parseInt(arr[3]) === (index+1)){
                                arr[3] = index;
                            }
                            g_controls[i].container = arr.join('_');
                        }
                    }
                    ref_parent_definition[idx].children = g_controls;
                    break;
                } else {
                    $scope.findComponentAndUpdateContainerDown(component_id, ref_parent_definition[idx].children, null, found_it, index, tabNumber);
                }
            }
        }
    };

    $scope.findComponentAndUpdateContainerRight = function (component_id, parent_definition, card, found_it, index, rowIndex, tabNumber) {
        var idx = 0, child_idx = 0;
        var ref_parent_definition = (card!=null) ? parent_definition[card] : parent_definition;
        if (!found_it) {
            for (idx = 0; idx < ref_parent_definition.length; idx++) {
                if (ref_parent_definition[idx].id == component_id) {
                    found_it= true;
                    var g_controls = ref_parent_definition[idx].children;
                    for(var i=0; i < g_controls.length; i++){
                        var arr = g_controls[i].container.split('_');
                        if(parseInt(arr[1]) === tabNumber){
                            if(parseInt(arr[5]) === index && parseInt(arr[3]) === rowIndex){
                                arr[5] = index + 1;
                            }else if(parseInt(arr[5]) === (index+1) && parseInt(arr[3]) === rowIndex){
                                arr[5] = index;
                            }
                            g_controls[i].container = arr.join('_');
                        }
                    }
                    ref_parent_definition[idx].children = g_controls;
                    break;
                } else {
                    $scope.findComponentAndUpdateContainerRight(component_id, ref_parent_definition[idx].children, null, found_it, index, rowIndex, tabNumber);
                }
            }
        }
    };

    $scope.findComponentAndUpdateContainerUp = function (component_id, parent_definition, card, found_it, index, tabNumber) {
        var idx = 0, child_idx = 0;
        var ref_parent_definition = (card!=null) ? parent_definition[card] : parent_definition;
        if (!found_it) {
            for (idx = 0; idx < ref_parent_definition.length; idx++) {
                if (ref_parent_definition[idx].id == component_id) {
                    found_it= true;
                    var g_controls = ref_parent_definition[idx].children;
                    for(var i=0; i < g_controls.length; i++){
                        var arr = g_controls[i].container.split('_');
                        if(parseInt(arr[1]) === tabNumber){
                            if(parseInt(arr[3]) === index){
                                arr[3] = index - 1;
                            }else if(parseInt(arr[3]) === (index-1)){
                                arr[3] = index;
                            }
                            g_controls[i].container = arr.join('_');
                        }
                    }
                    ref_parent_definition[idx].children = g_controls;
                    break;
                } else {
                    $scope.findComponentAndUpdateContainerUp(component_id, ref_parent_definition[idx].children, null, found_it, index, tabNumber);
                }
            }
        }
    };

    $scope.findComponentAndUpdateContainerLeft = function (component_id, parent_definition, card, found_it, index, rowIndex, tabNumber) {
        var idx = 0, child_idx = 0;
        var ref_parent_definition = (card!=null) ? parent_definition[card] : parent_definition;
        if (!found_it) {
            for (idx = 0; idx < ref_parent_definition.length; idx++) {
                if (ref_parent_definition[idx].id == component_id) {
                    found_it= true;
                    var g_controls = ref_parent_definition[idx].children;
                    for(var i=0; i < g_controls.length; i++){
                        var arr = g_controls[i].container.split('_');
                        if(parseInt(arr[1]) === tabNumber){
                            if(parseInt(arr[5]) === index && parseInt(arr[3]) === rowIndex){
                                arr[5] = index - 1;
                            }else if(parseInt(arr[5]) === (index-1) && parseInt(arr[3]) === rowIndex){
                                arr[5] = index;
                            }
                            g_controls[i].container = arr.join('_');
                        }
                    }
                    ref_parent_definition[idx].children = g_controls;
                    break;
                } else {
                    $scope.findComponentAndUpdateContainerLeft(component_id, ref_parent_definition[idx].children, null, found_it, index, rowIndex, tabNumber);
                }
            }
        }
    };

    $scope.getComponent = function( element ) {
        var id = $(element).attr('id');
        if ($(element).attr('dfx-gc-renderer-content')!=null) {
            var component_id = $(element).parent().attr('component-id');
            var column_id = $(element).parent().attr('column-id');
            return $scope.gc_instances[component_id].attributes.columns.value[column_id].renderer;
        } else {
            return $scope.gc_instances[id];
        }
    };

    $scope.setComponent = function( component ) {
        // update widget definition
        var parent_id = $('#'+component.id).parent().attr('gc-parent');
        var container_id = $('#'+component.id).parent().attr('gc-container');
        component.container = container_id;
        $scope.gc_instances[ component.id ] = component;
        DfxVisualBuilder.addComponentToDefinition(component.id, parent_id, component, $scope.view_card_selected);
    };

    // Load cards
    $scope.loadCards = function(view_definition) {
        if($scope.view_cards.length === 0){
            for (card in view_definition) {
                $scope.view_cards.push({"name": card});
            }
            $timeout(function() {
                $scope.view_card_select_index = 0;
                $scope.view_card_animation = (view_definition.default[0].animation) ? view_definition.default[0].animation : {
                  in: 'fadeIn',
                  out: 'slideOutLeft'
                }
            }, 1000);
        }
    };

    // Add components
    $scope.addComponents = function( components, container_component, card ) {
        var idx = 0;
        var ref_components = (card!=null) ? components[card] : components;
        for (idx = 0; idx < ref_components.length; idx++) {
            var component = ref_components[idx];
            $scope.addComponent(component, container_component, card);
        }
    };

    // Add a component
    $scope.addComponent = function( component, container_component, card) {
        var component_instance = $scope.renderGraphicalControl(component);
        if (container_component == null) {
            $('#dfx_visual_editor_workspace_' + card).append(component_instance.fragment);
        } else {
            $('#' + container_component.id + '_' + component.container).append(component_instance.fragment);
        }
    };

    // Render GControls
    $scope.renderGraphicalControl = function( component, callback, is_rendering_gc_template ) {
        $scope.gc_instances[component.id] = component;
        var gc_instance = {};
        var flex_container_attr = (component.flex=='true' || (component.attributes!=null && component.attributes.flex!=null)) ? ' flex="{{attributes.flex.value}}"' : '';

        var gc_layout = ((component.type == 'panel' || component.type == 'tabs' || component.type == 'wizard') &&
            component.attributes && (!component.attributes.autoHeight || component.attributes.autoHeight.value != true)) ?
                ' layout="column" ' : '';

        var dfx_gc_design_directive = is_rendering_gc_template ? ' dfx-gc-design="rendering_gc_template" ' : ' dfx-gc-design ';

        var gc_html_template = '<div id="' + component.id + '" dfx-gc-web-base dfx-gc-web-' + component.type +
            dfx_gc_design_directive + ' gc-type="' + component.type + '" gc-role="control"' + flex_container_attr + gc_layout + '></div>';

        gc_instance.fragment = $compile(gc_html_template)($scope, function(clonedElement) {
            if (callback) callback(clonedElement); // sometimes, especially when doing reloadPropertyPanel(), must wait until compilation is completed
        });
        gc_instance.id = component.id;

        return gc_instance;
    };

    // Load Property Panel
    $scope.loadPropertyPanel = function( component_id ) {
        var component = $scope.gc_instances[ component_id ];
        if ($scope.gc_selected != null) {
            $('#'+$scope.gc_selected.id).css('border', '0px');
        }
        $scope.gc_selected = $scope.gc_instances[component_id];
        $('#'+$scope.gc_selected.id).css('border', '2px #000 solid');

        // Destroy GC Property Panel scope and clean up DOM bindings
        var gc_property_panel_scope = angular.element( $('#dfx_visual_editor_property_panel').children('div') ).scope();
        if (gc_property_panel_scope) {
            gc_property_panel_scope.$destroy();
        }
        $('#dfx_visual_editor_property_panel').empty();

        // Load Property Panel for new selected element
        var gc_property_panel = $compile('<div id="' + component.id + '" dfx-gc-web-base dfx-gc-web-' + component.type + ' dfx-gc-edit></div>')($scope);
        $('#dfx_visual_editor_property_panel').empty();
        $('#dfx_visual_editor_property_panel').append(gc_property_panel);

        $('#dfx-ve-property-title-selected-gc').css('display', 'inline-block');
        $('#dfx-ve-property-title-selected-gc-text').text(component.attributes.name.value);
        $('#dfx-ve-property-title-selected-gc-text').attr('component-id', component.id);

        $scope.loadGcTemplatesByType();
    };

    $scope.reloadPropertyPanel = function() {
        $('#dfx-ve-property-title-selected-renderer').css('display', 'none');
        var id = $('#dfx-ve-property-title-selected-gc-text').attr('component-id');
        $scope.loadPropertyPanel(id);
    }

    $scope.removeComponent = function(component_id) {
        var confirm = $mdDialog.confirm()
            .title('Would you like to delete this component?')
            .content('The component and all child components will be deleted.')
            .cancel('No')
            .ok('Yes');
        $mdDialog.show(confirm).then(function() {
            var parent_id = $('#'+component_id).closest('[gc-parent]').attr('gc-parent');
            if (parent_id) {
                delete $scope.gc_instances[component_id];
                DfxVisualBuilder.removeComponentConfirmed(component_id, $scope.view_card_selected);
            } else {
                dfxMessaging.showWarning('Root panel can not be removed');
            }
        });
    };

    $scope.overrideAttribute = function(attribute_name) {
        function setAttibutesChainStatus(path, obj) {
            var schema = obj,
                pList = path.split('.');

            for (var i = 0; i < pList.length; i++) {
                var elem = pList[i];
                if (!schema[elem] && schema[elem] !== '') {
                    schema[elem] = {};
                }
                schema = schema[elem];
                if (schema !== null && typeof schema === 'object') {
                    schema.status = 'overridden';
                }
            }
        }
        setAttibutesChainStatus(attribute_name, $scope.gc_selected.attributes);
    };

    // Functions implementing UNDO in view editor - START
    $scope.setCalledFromPicker = function (options) {
        DfxViewEditorUndo.setCalledFromPicker($scope);
    };
    $scope.cacheAttributeOldValue = function (options) {
        DfxViewEditorUndo.cacheAttributeOldValue(options, $scope);
    };
    $scope.cacheAttributeNewValue = function (attribute_name) {
        DfxViewEditorUndo.cacheAttributeNewValue(attribute_name, $scope);
    };
    $scope.viewEditorUndo = function(event) {
        DfxViewEditorUndo.viewEditorUndo(event, $scope);
    };
    // Functions implementing UNDO in view editor - END

    // Functions implementing Cut/Copy/Paste in view editor - START
    $scope.viewEditorCut = function(event) {
        $(event.srcElement).animateCss('pulse');

        var component_id = $scope.gc_selected.id;
        var parent_id = $('#'+component_id).closest('[gc-parent]').attr('gc-parent');

        if (parent_id) {
            var view_definition = DfxVisualBuilder.movingComponentHelper.getViewDefinition();
            var component_definition = DfxVisualBuilder.getComponentDefinition($scope.gc_selected.id, view_definition.definition);

            component_definition.attributes = angular.copy($scope.gc_selected.attributes);// if comp attributes changed and not saved, it's only in scope at the moment of cut/copy

            $scope.view_editor_cached_component = component_definition;// put component in memory

            // remove component
            delete $scope.gc_instances[component_id];
            DfxVisualBuilder.removeComponentConfirmed(component_id, $scope.view_card_selected);
        } else {
            dfxMessaging.showWarning('Root panel can not be cut');
        }
    };

    $scope.viewEditorCopy = function(event) {
        $(event.srcElement).animateCss('pulse');

        var view_definition = DfxVisualBuilder.movingComponentHelper.getViewDefinition();
        var component_definition = DfxVisualBuilder.getComponentDefinition($scope.gc_selected.id, view_definition.definition);

        component_definition.attributes = angular.copy($scope.gc_selected.attributes);// if comp attributes changed and not saved, it's only in scope at the moment of cut/copy

        $scope.view_editor_cached_component = component_definition;// put component in memory
    };

    $scope.viewEditorPaste = function(event) {
        $(event.srcElement).animateCss('pulse');

        var getSelectedComponent = function () {
            if ($scope.gc_selected) {
                return $scope.gc_selected;
            } else { // get root panel from current card
                var view_definition = DfxVisualBuilder.movingComponentHelper.getViewDefinition();
                var current_card_root_panel_id = view_definition.definition[$scope.view_card_selected][0].id;
                var current_card_root_panel_full_definition = $scope.gc_instances[current_card_root_panel_id];
                return current_card_root_panel_full_definition;
            }
        };

        if ($scope.view_editor_cached_component) {
            var selected_component = getSelectedComponent();
            var cached_component_copy = angular.copy($scope.view_editor_cached_component);
            DfxVisualBuilder.pasteComponent(cached_component_copy, selected_component, $scope.view_card_selected);
        }
    };
    // Functions implementing Cut/Copy/Paste in view editor - END

    // Functions to work with GC Templates - START
    $scope.saveComponentAsTemplate = function(event) {
        $(event.srcElement).animateCss('pulse');

        var prepareAttributes = function(gc_template, gc_selected) {
            gc_template.attributes = gc_selected.attributes;
            delete gc_template.attributes.name; // remove because it's always overridden anyway
            gc_template.attributes.template = gc_template.attributes.template || {};
            gc_template.attributes.template.value = gc_template.attributes.template.value || 'default';

            Object.keys(gc_template.attributes).forEach(function(key, index) {
                gc_template.attributes[key].locked = false;
            });
        };

        $mdDialog.show({
            controller: DialogController,
            templateUrl: '/gcontrols/web/template_save.html',
            parent: angular.element(document.body),
            targetEvent: event
        })
        .then(function(gc_template) {
            var gc_selected = angular.copy($scope.gc_selected);
            DfxVisualBuilder.removeNotOverriddenAttributes(gc_selected.attributes, gc_selected.type);

            gc_template.type = gc_selected.type;
            gc_template.application = $scope.application_name;
            gc_template.platform = $scope.view_platform;

            prepareAttributes(gc_template, gc_selected);

            dfxGcTemplates.create( $scope, gc_template )
                .then(function() {
                    dfxMessaging.showMessage( 'The template ' + gc_template.name + ' has been created' );
                    $scope.gc_templates.push(gc_template);
                    $scope.loadGcTemplatesByType();

                    // if templates panel is open - refresh panel
                    if ($scope.gc_templates_to_drag_drop) {
                        $scope.cleanGcTemplatesToDragDrop();
                    }
                }, function(res) {
                    dfxMessaging.showWarning(res.data.error.message);
                });
        }, function() {
            // do nothing
        });

        function DialogController($scope, $mdDialog) {
            $scope.template = {"name": "", "description": ""};
            $scope.saveTemplateConfirm = function(answer) {
                $mdDialog.hide($scope.template);
            };

            $scope.saveTemplateCancel = function() {
                $mdDialog.cancel();
            };
        }
    };

    $scope.loadGcTemplates = function() {
        dfxGcTemplates.getAllByPlatform( $scope, $scope.application_name, $scope.view_platform ).then(function( data ) {
            $scope.gc_templates = data || [];

            $timeout(function() {
                var icon_type_prefix = 'dfx_ve_gc_template_icon_',
                    icon_type_prefix_length = icon_type_prefix.length;

                var gc_templates_types = $scope.gc_templates.map(function(item) {
                    return item.type;
                });
                var gc_templates_unique_types = gc_templates_types.filter(function(item, pos) {
                    return gc_templates_types.indexOf(item) == pos;
                });

                // add event listeners for gc types that have existing gc templates
                for (var i = 0; i < gc_templates_unique_types.length; i++) {
                    var $dfx_ve_gc_template_icon = $('#' + icon_type_prefix + gc_templates_unique_types[i]);

                    var gc_type = gc_templates_unique_types[i];
                    var gc_cat = $dfx_ve_gc_template_icon.attr('gc-cat');

                    var createGcTemplateListener = function(gc_type, gc_cat) {
                        $dfx_ve_gc_template_icon.on('click', function() {
                            $scope.getGcTemplatesToDragDrop(gc_type, gc_cat);
                        });
                    };
                    createGcTemplateListener(gc_type, gc_cat);
                }

                // add event listeners if not in gc_templates_unique_types, type "no templates" and hide searching
                var gc_all_types = $('[id^="' + icon_type_prefix + '"]');
                for (var i = 0; i < gc_all_types.length; i++) {
                    var dfx_ve_gc_template_icon_id = $(gc_all_types[i]).attr('id');
                    var type_name = dfx_ve_gc_template_icon_id.substring(icon_type_prefix_length);

                    if ( gc_templates_unique_types.indexOf(type_name) == -1 ) {
                        var $dfx_ve_gc_template_icon = $('#' + dfx_ve_gc_template_icon_id);

                        $dfx_ve_gc_template_icon.on('click', function() {
                            $scope.cleanGcTemplatesToDragDrop();
                        });
                    }
                }
            }, 0);
        });
    };

    var makeGcTemplatesDraggable = function(gc_type, gc_cat) {
        $timeout(function() {
            $('.dfx-ve-gc-template-draggable-instance').draggable({
                appendTo:          "body",
                cursorAt:          {top: 5, left: 17},
                cursor:            "move",
                helper: function (event) {
                    var helper_fragment = '<img style="width:36px;height:34px;" src="/images/vb/icons/' + gc_cat + '_' + gc_type + '_drag.png"/>';
                    return helper_fragment;
                },
                connectToSortable: ".dfx_visual_editor_droppable"
            });
        }, 0);
    };
    $scope.getGcTemplatesToDragDrop = function(gc_type, gc_cat) {
        var addGcTemplatesToFloatingPanel = function() {
            $timeout(function() {
                $scope.gc_templates_to_drag_drop = [];
                for (var i = 0; i < $scope.gc_templates.length; i++) {
                    if ($scope.gc_templates[i].type == gc_type) {
                        $scope.gc_templates_to_drag_drop.push( $scope.gc_templates[i] );
                    }
                }
                $scope.gc_templates_to_drag_drop_filtered = $scope.gc_templates_to_drag_drop;
                $scope.gc_template_filter = '';
                makeGcTemplatesDraggable(gc_type, gc_cat);
            }, 0);
        };

        addGcTemplatesToFloatingPanel();
    };

    $scope.cleanGcTemplatesToDragDrop = function() {
        $timeout(function() {
            $scope.gc_templates_to_drag_drop = [];
            $scope.gc_templates_to_drag_drop_filtered = [];
            $scope.gc_template_filter = '';
        }, 0);
    };

    $scope.loadGcTemplatesByType = function() {
        $scope.gc_templates_by_type = {};
        dfxGcTemplates.getByType( $scope, $scope.application_name, $scope.gc_selected.type, $scope.view_platform )
            .then( function(gc_templates) {
                gc_templates = gc_templates || {};
                gc_templates.unshift({ 'name': 'default' });
                $scope.gc_templates_by_type = gc_templates;
            });
    };

    $scope.reinitComponentWithTemplate = function(template_name, gc_id) {
        var component_id = gc_id || $scope.gc_selected.id;
        var view_definition = DfxVisualBuilder.movingComponentHelper.getViewDefinition();
        var gc_component_definition = DfxVisualBuilder.getComponentDefinition(component_id, view_definition.definition);
        gc_component_definition.attributes.template = {'value': template_name, 'status': 'overridden'};

        var reload_property_panel = gc_id ? false : true;
        var gc_element = $('#' + component_id);
        var gc_element_scope = angular.element(gc_element).scope();
        gc_element_scope.reinitAttributes(gc_component_definition, reload_property_panel);
    };

    $scope.loadGcTemplateLockingMenu = function($event) {
        DfxViewEditorGcTemplates.loadGcTemplateLockingMenu($event, $scope, $compile);
    };
    $scope.closeGcTemplateLockingMenu = function() {
        DfxViewEditorGcTemplates.closeGcTemplateLockingMenu($scope);
    };
    $scope.displayAllGcTemplateAttributes = function() {
        DfxViewEditorGcTemplates.displayAllGcTemplateAttributes($scope);
    };
    $scope.displayLockedGcTemplateAttributes = function() {
        DfxViewEditorGcTemplates.displayLockedGcTemplateAttributes($scope);
    };
    $scope.displayUnlockedGcTemplateAttributes = function() {
        DfxViewEditorGcTemplates.displayUnlockedGcTemplateAttributes($scope);
    };
    $scope.isGcAttributeVisible = function(is_locked) {
        return DfxViewEditorGcTemplates.isGcAttributeVisible(is_locked, $scope);
    };
    $scope.isGcSpecialAttributeVisible = function() {
        return DfxViewEditorGcTemplates.isGcSpecialAttributeVisible($scope);
    };

    $scope.openGcTemplateEditor = function(gc_template_name) {
        window.localStorage.removeItem('pagePreviewName');

        var application_name = $('#dfx-view-editor-body').attr('data-application');
        var view_platform = $('#dfx-view-editor-body').attr('data-platform');

        $window.open( '/studio/gctemplates/' + view_platform + '/' + application_name + '/' + gc_template_name + '/index.html', '_blank' );
    };

    $scope.filterGcTemplates = function() {
        if ($scope.gc_templates_to_drag_drop) {
            $scope.gc_templates_to_drag_drop_filtered = $scope.gc_templates_to_drag_drop.filter(function(gc_template) {
                return gc_template.name.indexOf($scope.gc_template_filter) > -1
                    || gc_template.description.indexOf($scope.gc_template_filter) > -1;
            });
        }
        if ($scope.gc_templates_to_drag_drop_filtered.length > 0) {
            var gc_type = $scope.gc_templates_to_drag_drop_filtered[0].type;
            var $dfx_ve_gc_template_icon = $('#dfx_ve_gc_template_icon_' + gc_type);
            var gc_cat = $dfx_ve_gc_template_icon.attr('gc-cat');
            makeGcTemplatesDraggable(gc_type, gc_cat);
        }
    };
    // Functions to work with GC Templates - END

    DfxVisualBuilder.init();
    $scope.loadGcTemplates();
}]);

dfxViewEditorApp.controller("dfx_view_editor_property_panel_controller", ['$scope', function($scope) {
    // This is a placeholder for GC Property Panel Controller, can not be removed
}]);

dfxViewEditorApp.directive('dfxGcWebDroppable', [ '$timeout', '$rootScope', function($timeout, $rootScope) {
    return {
        restrict: 'A',
        controller: function($scope, $element, $attrs) {
            angular.element(document).ready(function() {
                $('#'+$attrs.id).sortable({
                    appendTo:         'body',
                    cursor:           'move',
                    cursorAt:         {top: 15, left: 40},
                    placeholder:      'ui-placeholder',
                    refreshPositions: true,
                    handle:           '.dfx-ve-gc-handle',
                    tolerance:        'pointer',
                    scroll:           true,
                    connectWith:      '.dfx_visual_editor_droppable',
                    beforeStop: function (event, ui) {
                        var gc_id,
                            gc_type = $(ui.item).attr('gc-type'),
                            gc_flex = $(ui.item).attr('gc-flex'),
                            gc_template_name = $(ui.item).attr('gc-template-name');
                        if ($(ui.item).hasClass('dfx_visual_editor_gc_cat_item_draggable')) {
                            // Add a new component
                            gc_id  = Math.floor(Math.random() * 100000);
                            var view_editor = document.querySelector('#dfx_src_widget_editor');
                            var view_editor_scope = angular.element(view_editor).scope();
                            var gc = view_editor_scope.renderGraphicalControl({id: gc_id, type: gc_type, flex: gc_flex});
                            $(ui.item).replaceWith(gc.fragment);

                            if (gc_template_name) {
                                // Wait until dfxGcWebBase.initAttributes() completes its reading from DB in getGCDefaultAttributes()
                                var unregister = $rootScope.$on(gc_id + '_attributes_loaded', function(event, attributes) {
                                    view_editor_scope.reinitComponentWithTemplate(gc_template_name, gc_id);
                                    unregister();
                                });
                            }
                        } else {
                            // Move component
                            gc_id = $(ui.item).attr('id');
                            DfxVisualBuilder.moveComponent(gc_id, this, $scope.view_card_selected);
                        }
                    },
                    start: function (event, ui) {
                        $(ui.placeholder).html('<div style="border:1px #00c3f3 dashed;min-width:50px;height:30px;"></div>');
                    },
                    helper: 'clone'
                });
            });
        }
    }
}]);

dfxViewEditorApp.directive('dfxGcLayoutProperty', ['$mdToast', 'dfxMessaging', function($mdToast, dfxMessaging) {
    return {
        restrict: 'A',
        templateUrl: function( el, attrs ) {
            return '/gcontrols/web/layout_props.html';
        },
        controller: function($scope, $element, $attrs) {
            $scope.addLayoutRow = function() {
                var component = $scope.$parent.gc_selected;
                component.attributes.layout.status = "overridden";
                component.attributes.layout.rows.push({
                    "cols": [
                        {
                            "width": { "value": 100},
                            "autoWidth": { "value": false},
                            "display": { "value": "true"},
                            "classes": {
                                "value": ""
                            },
                            "dynamicClasses": {
                                "value": ""
                            },
                            "style": {
                                "value": ""
                            },
                            "orientation": {
                                "value": "row"
                            },
                            "halignment": {
                                "value": "start"
                            },
                            "valignment": {
                                "value": "start"
                            },
                            "css": {
                                "color": "",
                                "background": "",
                                "padding": "",
                                "text-align": ""
                            }
                        }
                    ],
                    "classes": {
                        "value": ""
                    },
                    "dynamicClasses": {
                        "value": ""
                    },
                    "style": {
                        "value": ""
                    }
                });
                DfxVisualBuilder.initGraphicalControls();
            };
            $scope.addLayoutColumn = function(row_index) {
                var component = $scope.$parent.gc_selected;
                component.attributes.layout.status = "overridden";
                component.attributes.layout.rows[row_index].cols.push({
                    "width": { "value": 25},
                    "autoWidth": { "value": false},
                    "display": { "value": "true"},
                    "classes": {
                        "value": ""
                    },
                    "dynamicClasses": {
                        "value": ""
                    },
                    "style": {
                        "value": ""
                    },
                    "orientation": {
                        "value": "row"
                    },
                    "halignment": {
                        "value": "start"
                    },
                    "valignment": {
                        "value": "start"
                    },
                    "css": {
                        "color": "",
                        "background": "",
                        "padding": "",
                        "text-align": ""
                    }
                });
                DfxVisualBuilder.initGraphicalControls();
            };

            $scope.deleteLayoutColumn = function(row_index, col_index) {
                var component = $scope.$parent.gc_selected;
                var row_cols = component.attributes.layout.rows[row_index].cols;

                if (col_index===0 && row_cols.length===1) {

                  dfxMessaging.showWarning('The layout row must contain at least one column');

                } else {

                  if ($('#'+$scope.$parent.gc_selected.id+'_layout_0_row_'+row_index+'_column_'+col_index).children().length>0) {

                      // move components from removed row to the first row or to the second (in case when first row is removed)
                      var container_id = $scope.$parent.gc_selected.id;

                      var to_layout_id = col_index == 0 ? 'layout_0_row_'+row_index+'_column_1' : 'layout_0_row_'+row_index+'_column_0';

                      var column_children = $('#'+$scope.$parent.gc_selected.id+'_layout_0_row_'+row_index+'_column_'+col_index).children();
                      if (column_children.length > 0) {

                          for (var i = 0; i < column_children.length; i++) {
                              var next_gc_id = column_children[i].id;

                              // Move component
                              DfxVisualBuilder.moveComponentFromRemovedLayout(next_gc_id, $scope.$parent.view_card_selected, container_id, to_layout_id);
                          }
                      }
                  }

                  component.attributes.layout.status = "overridden";
                  component.attributes.layout.rows[row_index].cols.splice(col_index, 1);

                  // reindex layout children
                  var editor = $('#dfx_src_editor.CodeMirror')[0].CodeMirror;
                  var wgt_definition = JSON.parse(editor.getValue());
                  DfxVisualBuilder.reindexLayoutChildComponents(row_index, col_index, container_id, wgt_definition.definition, $scope.$parent.view_card_selected, false);
                  editor.setValue(JSON.stringify(wgt_definition, null, '\t'));

                }
            };

            $scope.deleteLayoutRow = function(row_index) {
                var component = $scope.$parent.gc_selected;
                var row_cols = component.attributes.layout.rows[row_index].cols;

                if (row_index===0 && component.attributes.layout.rows.length===1) {

                  dfxMessaging.showWarning('The layout must contain at least one row');

                } else {

                    // move components from removed row to the first row or to the second (in case when first row is removed)
                    var container_id = $scope.$parent.gc_selected.id;


                    var to_layout_id = row_index == 0 ? 'layout_0_row_1_column_0' : 'layout_0_row_' + (row_index-1) + '_column_0';

                    for (var i = 0; i < row_cols.length; i++) {
                        var column_children = $('#'+$scope.$parent.gc_selected.id+'_layout_0_row_'+row_index+'_column_'+i).children();
                        if (column_children.length > 0) {
                            for (var j = 0; j < column_children.length; j++) {
                                var next_gc_id = column_children[j].id;

                                // Move component
                                DfxVisualBuilder.moveComponentFromRemovedLayout(next_gc_id, $scope.$parent.view_card_selected, container_id, to_layout_id);
                            }
                        }
                    }

                    component.attributes.layout.status = "overridden";
                    component.attributes.layout.rows.splice(row_index, 1);

                    // reindex layout children
                    var editor = $('#dfx_src_editor.CodeMirror')[0].CodeMirror;
                    var wgt_definition = JSON.parse(editor.getValue());
                    DfxVisualBuilder.reindexLayoutChildComponents(row_index, null, container_id, wgt_definition.definition, $scope.$parent.view_card_selected, false);
                    editor.setValue(JSON.stringify(wgt_definition, null, '\t'));

                }
            };
        }
    }
}]);

dfxViewEditorApp.directive('dfxGcExtendedProperty', [function() {
    return {
        restrict: 'A',
        templateUrl: function( el, attrs ) {
            return '/gcontrols/web/extended_props.html';
        },
        controller: function($scope, $element, $attrs) {
            $scope.addExtendedDirective = function() {
                var component = $scope.$parent.gc_selected;
                if (component.attributes.ext_directives==null) {
                    component.attributes.ext_directives = [{'directive':'','value':''}];
                } else {
                    component.attributes.ext_directives.push({'directive':'','value':''});
                }
            };
        }
    }
}]);

dfxViewEditorApp.directive('dfxGcRendererDesign', ['$compile', '$timeout', function($compile, $timeout) {
    return {
        restrict: 'A',
        link: function($scope, $element, $attrs) {
            $timeout(function() {
                var angular_snippet = $compile('<div id="'+$attrs.componentId+'_renderer_'+$attrs.columnId+'" dfx-gc-web-base dfx-gc-web-'+$attrs.dfxGcRendererDesign+' dfx-gc-design dfx-gc-renderer-content="'+$attrs.componentId+'"></div>')($scope);
                $element.append(angular_snippet);
            }, 0);
        }
    }
}]);

dfxViewEditorApp.directive('dfxVePickerIcon', ['$q', '$http', '$mdDialog', '$timeout', '$compile', '$filter', function($q, $http, $mdDialog, $timeout, $compile, $filter) {
    return {
        restrict: 'A',
        transclude: true,
        replace: true,
        link: function(scope, element, attrs) {
            scope.showFontIcons = function(ev, iconObj) {
                scope.targetLabel = ev.target;// needed for UNDO functionality
                scope.targetLabelField = $(scope.targetLabel).parent().children('input');// needed for UNDO functionality

                scope.iconObj = iconObj;
                scope.faIcons = [];
                scope.svgCategories = [];
                scope.svgIcons = [];
                scope.faLoaded = $http.get('/gcontrols/web/picker_icon.json').then(function(res){
                    for ( var i = 0; i < res.data.faClasses.length; i++ ) {
                        var faResIcon = { "value": res.data.faClasses[i], "category": "'fa-icons'", "type": "fa-icon" };
                        scope.faIcons.push( faResIcon );
                    }
                });
                scope.svgLoaded = $http.get('/gcontrols/web/mdicons.json').then(function(res){
                    for ( var i = 0; i < res.data.length; i++ ) {
                        scope.svgCategories.push( res.data[i].type );
                        for ( var j = 0; j < res.data[i].items.length; j++ ) {
                            var svgResIcon = { "value": res.data[i].items[j], "category": "'"+res.data[i].type+"', 'svg-icons'", "type": "svg-icon" };
                            scope.svgIcons.push( svgResIcon );
                        }
                    }
                    scope.dfxIconsList = scope.svgIcons.concat(scope.faIcons);
                    scope.dfxFilteredIconsList = scope.dfxIconsList;
                });
                $q.all([scope.faLoaded, scope.svgLoaded]).then(function(){
                    $('body').append('<div class="dfx-ve-dialog"></div>');
                    $('.dfx-ve-dialog').load('/gcontrols/web/picker_icon_list.html', function(){
                        $compile($('.dfx-ve-dialog').contents())(scope);
                        $('.sp-container').remove();
                        $('#dfx-ve-icons-dialog').keyup(function(e) {
                            if(e.which === 27) scope.closeVeIconsDialog();
                            if(e.which === 13 && document.activeElement.tagName!=='BUTTON') scope.closeVeIconsDialog();
                            e.preventDefault();
                            e.stopPropagation();
                        });
                        $timeout(function() {
                            $('.dfx-ve-content-dialog').addClass('active');
                            $('#exit-icons-dialog').focus();
                        }, 250);
                    });
                });
            }
            scope.iconsCategory = '';
            scope.chooseIconsCategory = function( iconCategory, ev ) {
                scope.dfxIconsList = $filter('filter')(scope.dfxFilteredIconsList, "'"+iconCategory+"'", 'strict');
                switch ( iconCategory ) {
                    case 'svg-icons': scope.iconsCategory = '/ ' + 'SVG Icons'; break;
                    case 'fa-icons': scope.iconsCategory = '/ ' + 'Font Awesome Icons'; break;
                    default: scope.iconsCategory = '/ ' + iconCategory;
                }
                $(".dfx-ve-content-categories span").removeClass('active');
                $(ev.target).addClass('active');
            }
            scope.searchIcons = function( icon ) {
                scope.dfxIconsList = $filter('filter')(scope.dfxFilteredIconsList, icon, 'strict');
                scope.iconsCategory = '| ' + icon;
                $(".dfx-ve-content-categories span").removeClass('active');
            }
            scope.setDfxIcon = function(icon, type) {
                scope.$parent.cacheAttributeOldValue({ 'value': scope.iconObj.value });// needed for UNDO functionality

                scope.iconObj.value = "'"+icon+"'";
                scope.iconObj.type = type;
                scope.$parent.setCalledFromPicker();// needed for UNDO functionality
                $(scope.targetLabelField).focus().blur();
                scope.closeVeIconsDialog();
            }
            scope.closeVeIconsDialog = function(){
                $('.dfx-ve-content-dialog').removeClass('active');
                $timeout(function(){
                    angular.element($('.dfx-ve-dialog')).remove();
                    $('.sp-container').remove();
                    if($('#dfx-ve-menu-editor-dialog').length > 0) $('#dfx-ve-menu-editor-dialog').focus();

                    scope.$parent.overrideAttribute('icon');
                }, 250);
            }
        }
    }
}]);

dfxViewEditorApp.directive('dfxVeCssStyle', ['$timeout', '$compile', function($timeout, $compile) {
    return {
        restrict: 'E',
        transclude: true,
        replace: true,
        templateUrl: function( el, attrs ) {
            return '/gcontrols/web/css_style.html';
        },
        link: function(scope, element, attrs) {
            scope.showCssStyles = function(ev) {
                scope.attributes.style.status = "overridden"; // must be here, no need to override before clicking on the picker
                var dfxCssStyleDialog = '<div class="dfx-ve-dialog"></div>';
                $('body').append(dfxCssStyleDialog);
                $('.dfx-ve-dialog').load('/gcontrols/web/css_styles_tree.html', function(response,status,xhr){
                    $compile($('.dfx-ve-dialog').contents())(scope);
                    $('.sp-container').remove();
                    scope.preview = {};
                    $timeout(function() {
                        $('.dfx-ve-css-style-editor').addClass('active');
                        $('#save-css-styles').focus();
                        $('#dfx-ve-css-style-dialog').keyup(function(e) {
                            if(e.which === 27) scope.closeCssDialog();
                            if(e.which === 13) scope.saveStyles();
                            e.preventDefault();
                            e.stopPropagation();
                        });
                        scope.inputStyle = $(".css-style");
                        scope.targetStyles = ev.target;
                        scope.targetElement = $(scope.targetStyles).parent().children('input');
                        scope.targetValue = angular.element(scope.targetElement).data('$ngModelController').$viewValue;
                        scope.cssStyles = scope.targetValue.split(";");
                        scope.previewBox = {};
                        var ifButtonGc = scope.attributes.name.value;
                        var isButtonGc = ifButtonGc.indexOf("Button");
                        if ( isButtonGc >= 0 ) {
                            $(".dfx-css-style-preview-inner").addClass('md-raised md-primary md-altTheme-theme glyph md-button');
                        }
                        $(".dfx-css-style-preview-inner").css('opacity',1);
                        var newStyle = '',
                            styleRules = {},
                            otherStyles = [],
                            styleItem = '',
                            styleName = '',
                            styleValue = '';
                        for (var i = 0; i < scope.cssStyles.length; i++) {
                            var styleRule = scope.cssStyles[i].split(':'),
                                styleRuleName = String(styleRule[0]).replace(/(^\s+|\s+$)/g,''),
                                styleRuleValue = String(styleRule[1]).replace(/(^\s+|\s+$)/g,'');
                            if (styleRule.length === 2 && styleRuleName !== '' && styleRuleValue !== '' ) {
                                styleRule[0] = styleRuleName;
                                styleRule[1] = styleRuleValue;
                                switch(styleRule[0]) {
                                    case 'background': $(".css-style.background").val(styleRule[1]); break;
                                    case 'background-attachment': $(".css-style.background-attachment").val(styleRule[1]); break;
                                    case 'background-color': $(".css-style.background-color").val(styleRule[1]); scope.previewBox.BackgroundColor = styleRule[1]; break;
                                    case 'background-image': $(".css-style.background-image").val(styleRule[1]); break;
                                    case 'background-position': $(".css-style.background-position").val(styleRule[1]); break;
                                    case 'background-repeat': $(".css-style.background-repeat").val(styleRule[1]); break;
                                    case 'background-size': $(".css-style.background-size").val(styleRule[1]); break;
                                    case 'border': $(".css-style.border").val(styleRule[1]); break;
                                    case 'border-style': $(".css-style.border-style").val(styleRule[1]); scope.previewBox.BorderStyle = styleRule[1]; break;
                                    case 'border-width': $(".css-style.border-width").val(styleRule[1]); scope.previewBox.BorderWidth = styleRule[1]; break;
                                    case 'border-color': $(".css-style.border-color").val(styleRule[1]); scope.previewBox.BorderColor = styleRule[1]; break;
                                    case 'border-top': $(".css-style.border-top").val(styleRule[1]); scope.previewBox.BorderTop = styleRule[1]; break;
                                    case 'border-right': $(".css-style.border-right").val(styleRule[1]); scope.previewBox.BorderRight = styleRule[1]; break;
                                    case 'border-bottom': $(".css-style.border-bottom").val(styleRule[1]); scope.previewBox.BorderBottom = styleRule[1]; break;
                                    case 'border-left': $(".css-style.border-left").val(styleRule[1]); scope.previewBox.BorderLeft = styleRule[1]; break;
                                    case 'border-radius': $(".css-style.border-radius").val(styleRule[1]); scope.previewBox.BorderRadius = styleRule[1]; break;
                                    case 'box-sizing': $(".css-style.box-sizing").val(styleRule[1]); break;
                                    case 'box-shadow': $(".css-style.box-shadow").val(styleRule[1]); scope.previewBox.BoxShadow = styleRule[1]; break;
                                    case 'cursor': $(".css-style.cursor").val(styleRule[1]); scope.previewBox.Cursor = styleRule[1]; break;
                                    case 'direction': $(".css-style.direction").val(styleRule[1]); break;
                                    case 'display': $(".css-style.display").val(styleRule[1]); break;
                                    case 'flex': $(".css-style.flex").val(styleRule[1]); break;
                                    case 'flex-basis': $(".css-style.flex-basis").val(styleRule[1]); break;
                                    case 'flex-direction': $(".css-style.flex-direction").val(styleRule[1]); break;
                                    case 'flex-flow': $(".css-style.flex-flow").val(styleRule[1]); break;
                                    case 'flex-grow': $(".css-style.flex-grow").val(styleRule[1]); break;
                                    case 'flex-shrink': $(".css-style.flex-shrink").val(styleRule[1]); break;
                                    case 'flex-wrap': $(".css-style.flex-wrap").val(styleRule[1]); break;
                                    case 'justify-content': $(".css-style.justify-content").val(styleRule[1]); break;
                                    case 'float': $(".css-style.float").val(styleRule[1]); break;
                                    case 'clear': $(".css-style.clear").val(styleRule[1]); break;
                                    case 'font-family': $(".css-style.font-family").val(styleRule[1]); scope.previewBox.FontFamily = styleRule[1]; break;
                                    case 'font-size': $(".css-style.font-size").val(styleRule[1]); scope.previewBox.FontSize = styleRule[1]; break;
                                    case 'color': $(".css-style.color").val(styleRule[1]); scope.previewBox.Color = styleRule[1]; break;
                                    case 'font-style': $(".css-style.font-style").val(styleRule[1]); scope.previewBox.FontStyle = styleRule[1]; break;
                                    case 'font-weight': $(".css-style.font-weight").val(styleRule[1]); scope.previewBox.FontWeight = styleRule[1]; break;
                                    case 'line-height': $(".css-style.line-height").val(styleRule[1]); scope.previewBox.LineHeight = styleRule[1]; break;
                                    case 'letter-spacing': $(".css-style.letter-spacing").val(styleRule[1]); scope.previewBox.LetterSpacing = styleRule[1]; break;
                                    case 'text-align': $(".css-style.text-align").val(styleRule[1]); scope.previewBox.TextAlign = styleRule[1]; break;
                                    case 'text-transform': $(".css-style.text-transform").val(styleRule[1]); scope.previewBox.TextTransform = styleRule[1]; break;
                                    case 'text-shadow': $(".css-style.text-shadow").val(styleRule[1]); scope.previewBox.TextShadow = styleRule[1]; break;
                                    case 'vertical-align': $(".css-style.vertical-align").val(styleRule[1]); break;
                                    case 'white-space': $(".css-style.white-space").val(styleRule[1]); break;
                                    case 'word-spacing': $(".css-style.word-spacing").val(styleRule[1]); break;
                                    case 'word-wrap': $(".css-style.word-wrap").val(styleRule[1]); break;
                                    case 'height': $(".css-style.height").val(styleRule[1]); break;
                                    case 'min-height': $(".css-style.min-height").val(styleRule[1]); break;
                                    case 'max-height': $(".css-style.max-height").val(styleRule[1]); break;
                                    case 'list-style': $(".css-style.list-style").val(styleRule[1]); break;
                                    case 'list-style-position': $(".css-style.list-style-position").val(styleRule[1]); break;
                                    case 'list-style-type': $(".css-style.list-style-type").val(styleRule[1]); break;
                                    case 'margin': $(".css-style.margin").val(styleRule[1]); break;
                                    case 'margin-top': $(".css-style.margin-top").val(styleRule[1]); break;
                                    case 'margin-right': $(".css-style.margin-right").val(styleRule[1]); break;
                                    case 'margin-bottom': $(".css-style.margin-bottom").val(styleRule[1]); break;
                                    case 'margin-left': $(".css-style.margin-left").val(styleRule[1]); break;
                                    case 'opacity': $(".css-style.opacity").val(styleRule[1]); scope.previewBox.Opacity = styleRule[1]; break;
                                    case 'padding': $(".css-style.padding").val(styleRule[1]); break;
                                    case 'padding-top': $(".css-style.padding-top").val(styleRule[1]); break;
                                    case 'padding-right': $(".css-style.padding-right").val(styleRule[1]); break;
                                    case 'padding-bottom': $(".css-style.padding-bottom").val(styleRule[1]); break;
                                    case 'padding-left': $(".css-style.padding-left").val(styleRule[1]); break;
                                    case 'position': $(".css-style.position").val(styleRule[1]); break;
                                    case 'top': $(".css-style.top").val(styleRule[1]); break;
                                    case 'right': $(".css-style.right").val(styleRule[1]); break;
                                    case 'bottom': $(".css-style.bottom").val(styleRule[1]); break;
                                    case 'Left': $(".css-style.Left").val(styleRule[1]); break;
                                    case 'z-index': $(".css-style.z-index").val(styleRule[1]); break;
                                    case 'transition': $(".css-style.transition").val(styleRule[1]); break;
                                    case 'width': $(".css-style.width").val(styleRule[1]); break;
                                    case 'min-width': $(".css-style.min-width").val(styleRule[1]); break;
                                    case 'max-width': $(".css-style.max-width").val(styleRule[1]); break;
                                    default: newStyle = styleRule[0] + ':' + styleRule[1]; otherStyles.push(newStyle); break;
                                }
                            }
                        }
                        scope.otherStyles = otherStyles.join(";");
                    }, 250);
                });
            }
            scope.saveStyles = function() {
                scope.$parent.cacheAttributeOldValue({ 'value': scope.targetElement.val() });// needed for UNDO functionality

                var savedStyles = [];
                for (var i = 0; i < scope.inputStyle.length; i++) {
                    if (scope.inputStyle[i].value !== '') {
                        savedStyle = scope.inputStyle[i].name + ':' + scope.inputStyle[i].value;
                        savedStyles.push(savedStyle);
                    }
                }
                savedStyles.push(scope.otherStyles);
                scope.targetElement.val(savedStyles.join(";"));
                angular.element(scope.targetElement).data('$ngModelController').$setViewValue(scope.targetElement.val());
                scope.$parent.cacheAttributeNewValue(scope.targetElement.attr('ng-model'));// needed for UNDO functionality
                scope.closeCssDialog();
            }
            scope.closeCssDialog = function(){
                $('.dfx-ve-css-style-editor').removeClass('active');
                $timeout(function(){
                    angular.element($('.dfx-ve-dialog')).remove();
                    $('.sp-container').remove();
                    if($('#dfx-ve-menu-editor-dialog').length > 0) $('#dfx-ve-menu-editor-dialog').focus();
                }, 250);
            }

        }
    }
}]);

dfxViewEditorApp.directive('dfxVePickerColumn', [ '$compile', '$mdDialog', function($compile, $mdDialog) {
    return {
        restrict: 'E',
        transclude: true,
        replace: true,
        templateUrl: function( el, attrs ) {
            return '/gcontrols/web/picker_column.html';
        },
        link: function(scope, element, attrs) {
            scope.editRendererProperties = function(ev, column_idx) {
                var component = scope.gc_selected;
                $('#dfx_visual_editor_property_panel div:first-child').css( 'display', 'none' );
                var renderer = { "id": (component.id + '_renderer_'  + column_idx), "type": component.attributes.columns.value[column_idx].renderer.name, "attributes": component.attributes.columns.value[column_idx].renderer.attributes, "children":[] };
                scope.gc_instances[component.id + '_renderer_' + column_idx] = renderer;
                scope.gc_selected = scope.gc_instances[component.id + '_renderer_' + column_idx];
                scope.attributes = renderer.attributes;
                scope.children = [];
                scope.renderer = renderer;
                var column_idx_label = parseInt(column_idx)+1;
                $('#dfx-ve-property-title-selected-renderer').css('display','inline-block');
                $('#dfx-ve-property-title-selected-renderer-text').text( component.attributes.columns.value[column_idx].name );
                $('#dfx_visual_editor_property_help').attr('href', 'http://www.interactive-clouds.com');
                var gc_property_panel = $compile('<div id="' + renderer.id + '" dfx-gc-web-base dfx-gc-web-' + renderer.type + ' dfx-gc-edit></div>')(scope);
                $('#dfx_visual_editor_property_panel').append(gc_property_panel);
            };

            var setAttributeValue = function(attribute_name) {
                scope.column.renderer.attributes[attribute_name] = scope.gc_selected.attributes[attribute_name];
            };
            var updateDataTableContent = function(attribute_name) {
                var components = document.querySelectorAll('[id="' + scope.gc_selected.id + '"]');
                for (var i = 0; i < components.length; i++) {
                    var component_scope = angular.element(components[i]).scope();
                    component_scope.attributes[attribute_name] = scope.gc_selected.attributes[attribute_name];
                }
            };
            scope.overrideAttribute = function(attribute_name) {
                scope.gc_selected.attributes[attribute_name].status = 'overridden';
                setAttributeValue(attribute_name);
                updateDataTableContent(attribute_name);
            };
        }

    }
}]);

dfxViewEditorApp.directive('dfxVeColorPicker', ['$timeout', function($timeout) {
    return {
        restrict: 'E',
        transclude: true,
        replace: true,
        require: 'ngModel',
        templateUrl: function( $el, $attrs ) {
            return '/gcontrols/web/color_picker.html';
        },
        controller: function($scope, $element, $attrs) {
            $timeout(function(){
                var element_id = $scope.component_id + '_' + $attrs.name + '_color_picker';
                $element.attr('id', element_id);
                $("#"+element_id).spectrum({
                    preferredFormat: "hex",
                    showAlpha: true,
                    showInput: true,
                    allowEmpty: true,
                    clickoutFiresChange: false
                }).show().on('change', function(){
                    angular.element($element).data('$ngModelController').$setViewValue($element.val());
                });
                $scope.setColor = function() {
                    var inputColor = $("input#"+element_id).val();
                    if (inputColor) {
                        $("#"+element_id).spectrum("set", inputColor);
                    }
                }
                setTimeout($scope.setColor, 500);
            }, 0);
        }
    }
}]);

dfxViewEditorApp.directive('dfxVePickerImage', (function($mdDialog, $timeout, $compile) {
    return {
        restrict: 'E',
        transclude: true,
        replace: true,
        templateUrl: function( el, attrs ) {
            return '/gcontrols/web/picker_image.html';
        },
        link: function(scope, element, attrs) {
            if ( !$(element).hasClass('dfx-carousel-image-picker') ) {
                scope.attributes.src.status = "overridden";
            }
            scope.isCreate = false;
            scope.showImages = function(ev) {
                DfxStudio.Resources.getWidgetImageResources(function(res){
                    scope.appImages = [];
                    scope.sharedImages = [];

                    var resAppImages = [],
                        resSharedImages = [];

                    if ((! res) || res.length == 0) return; // no images
                    if (res[0] && res[0].application) resAppImages = res[0].images;
                    if (res[0] && (! res[0].application)) resSharedImages = res[0].images;
                    if (res[1] && res[1].application) resAppImages = res[1].images;
                    if (res[1] && (! res[1].application)) resSharedImages = res[1].images;

                    var appPath = (resAppImages.length > 0) ? resAppImages[0].path.indexOf("/assets/") : 0;
                    var sharedPath = (resSharedImages.length > 0) ? resSharedImages[0].path.indexOf("/_shared/") : 0;

                    for (var i = resAppImages.length-1; i >= 0; i--) {
                        var appImg = resAppImages[i].path.substr(appPath);
                        scope.appImages.push(appImg);
                    }
                    for (var i = resSharedImages.length-1; i >= 0; i--) {
                        var sharedImg = resSharedImages[i].path.substr(sharedPath);
                        scope.sharedImages.push(sharedImg);
                    }
                });
                if ( !$(element).hasClass('dfx-carousel-image-picker') ) {
                    $mdDialog.show({
                        scope: scope.$new(),
                        parent: angular.element(document.body),
                        targetEvent: ev,
                        clickOutsideToClose: true,
                        ariaLabel: 'picker-images',
                        templateUrl: '/gcontrols/web/picker_images_form.html',
                        controller: function(){
                            scope.setImage = function(src) {
                                scope.$parent.cacheAttributeOldValue({ 'value': scope.attributes[attrs.dfxPickerProperty].value });// needed for UNDO functionality
                                scope.attributes[attrs.dfxPickerProperty].value = "'"+src+"'";
                                scope.$parent.cacheAttributeNewValue(attrs.dfxPickerProperty);// needed for UNDO functionality
                                $mdDialog.hide();
                            }
                            scope.closeDialog = function(){
                                $mdDialog.hide();
                            }
                        }
                    });
                } else {
                    $timeout(function(){
                        $('#' + scope.component_id + '_md_dialog .second-dialog-box').load('/gcontrols/web/carousel_images_picker.html');
                        $timeout(function(){
                            $compile($('#' + scope.component_id + '_md_dialog .second-dialog-box').contents())(scope);
                            $('#' + scope.component_id + '_md_dialog .second-dialog').fadeIn(500);
                        }, 250);
                    }, 250);
                }
            };
        }
    }
}));

dfxViewEditorApp.filter('checkExpression', [ function() {
    return function( input ) {
        var regexp = /(^\')(.*)(\'$)/gm,
            filtered = regexp.exec( input );

        if ( input && ( input.indexOf('+') >= 0 ) ) {
            filtered = false;
        } else if ( input === '' ) {
            filtered = true;
        }

        return filtered ? input : '{expression}';
    };
}]);

dfxViewEditorApp.directive('dfxVeExpressionEditor', [ '$mdDialog', function($mdDialog) {
    return {
        restrict: 'E',
        transclude: true,
        replace: true,
        require: '?ngModel',
        templateUrl: function( el, attrs ) {
            return '/gcontrols/web/label_picker.html';
        },
        link: function(scope, element, attrs) {
            var re = /(\$scope\.)(\w*)/g;
            var str = $('#dfx_script_editor.CodeMirror')[0].CodeMirror.getValue();
            var m;
            scope.scopeVars = [];
            while ((m = re.exec(str)) !== null) {
                if (m.index === re.lastIndex) {
                    re.lastIndex++;
                }
                if (scope.scopeVars.indexOf(m[2]) == -1) {
                    scope.scopeVars.push(m[2]);
                }
            }
            scope.scopeVars.sort();
            scope.showExpressionEditor = function(ev) {
                $mdDialog.show({
                    scope: scope.$new(),
                    parent: angular.element(document.body),
                    targetEvent: ev,
                    clickOutsideToClose: true,
                    ariaLabel: 'label-editor',
                    templateUrl: '/gcontrols/web/label_editor.html',
                    onComplete: function() {
                        scope.targetLabel = ev.target;
                        scope.targetLabelField = $(scope.targetLabel).parent().children('input');
                        scope.targetLabelValue = angular.element(scope.targetLabelField).data('$ngModelController').$viewValue;
                        $("textarea.expression-textarea").val(scope.targetLabelValue);
                        if (scope.attributes.label) { scope.attributes.label.status = "overridden"; }
                        if (scope.attributes.display) { scope.attributes.display.status = "overridden"; }
                        if (scope.attributes.disabled) { scope.attributes.disabled.status = "overridden"; }
                        $('#dfx-ve-expression-dialog').keyup(function(e) {
                            if(e.which === 13) {
                                var activeTagName = document.activeElement.tagName;
                                if(activeTagName!=='A' && activeTagName!=='TEXTAREA' && activeTagName!=='BUTTON') scope.setLabel();
                            }
                            e.preventDefault();
                            e.stopPropagation();
                        });
                    },
                    controller: function() {
                        scope.addVariable = function(ev) {
                            var cursorPos = document.getElementById(scope.component_id+"_expression_textarea").selectionStart,
                                areaValue = $("#"+scope.component_id+"_expression_textarea").val(),
                                expressionLength = $("#"+scope.component_id+"_expression_textarea").val().length,
                                varName = ev.target.textContent;
                            $("#"+scope.component_id+"_expression_textarea").val(areaValue.substring(0, cursorPos) + varName + areaValue.substring(cursorPos));
                        }
                        scope.setLabel = function() {
                            var old_expression = scope.targetLabelField.val();// needed for UNDO functionality
                            scope.$parent.cacheAttributeOldValue({ 'value': old_expression, 'called_from_picker': true });// needed for UNDO functionality

                            scope.newExpression = $("textarea.expression-textarea").val();
                            scope.targetLabelField.val(scope.newExpression);
                            angular.element(scope.targetLabelField).data('$ngModelController').$setViewValue(scope.newExpression);

                            scope.$parent.setCalledFromPicker();// needed for UNDO functionality
                            $(scope.targetLabelField).focus().blur();
                            $mdDialog.hide();
                        }
                        scope.clearLabel = function() {
                            $("textarea.expression-textarea").val('');
                        }
                        scope.closeDialog = function(){
                            $mdDialog.hide();
                        }
                    }
                })
            };
        }
    }
}]);

dfxViewEditorApp.directive('dfxVeMenuEditor', [ '$mdDialog', '$mdToast', '$http', '$timeout', '$compile', '$q', function($mdDialog, $mdToast, $http, $timeout, $compile, $q) {
    return {
        restrict: 'E',
        transclude: true,
        replace: true,
        templateUrl: function( el, attrs ) {
            return '/gcontrols/web/picker_menu.html';
        },
        link: function(scope, element, attrs) {
            if(attrs.side){
                if(attrs.side==='left'){
                    $(element).attr('side','left');
                    $(element).find('span').attr('side','left');
                    $(element).find('md-icon').attr('side','left');
                } else {
                    $(element).attr('side','right');
                    $(element).find('span').attr('side','right');
                    $(element).find('md-icon').attr('side','right');
                }
            }
            scope.menuItemsType = {"value":""};
            scope.menuItemNames = {"value":""};
            scope.dialogGcType = '';
            scope.actionsMode = {"value": false};
            scope.showMenuEditor = function(ev) {
                // needed for UNDO functionality
                // scope.$parent.cacheAttributeOldValue({
                //     'value': {
                //         menuItems: scope.attributes.menuItems.value,
                //         menuItemNames: scope.attributes.menuItemNames.value,
                //         menuItemsType: scope.attributes.menuItemsType.value
                //     }
                // });

                if (scope.attributes.layoutType.value === 'wizard' || scope.attributes.layoutType.value === 'tabs' || scope.attributes.layoutType.value === 'panel'){
                    scope.toolbarSide = $(ev.target).attr('side');
                    if(scope.toolbarSide==='left'){
                        scope.$parent.cacheAttributeOldValue({
                            'value': {
                                menuItems: scope.attributes.toolbar.leftMenu.menuItems.value,
                                menuItemNames: scope.attributes.toolbar.leftMenu.menuItemNames.value,
                                menuItemsType: scope.attributes.toolbar.leftMenu.menuItemsType.value
                            }
                        });
                    }else{
                        scope.$parent.cacheAttributeOldValue({
                            'value': {
                                menuItems: scope.attributes.toolbar.rightMenu.menuItems.value,
                                menuItemNames: scope.attributes.toolbar.rightMenu.menuItemNames.value,
                                menuItemsType: scope.attributes.toolbar.rightMenu.menuItemsType.value
                            }
                        });
                    }
                } else {
                    scope.$parent.cacheAttributeOldValue({
                        'value': {
                            menuItems: scope.attributes.menuItems.value,
                            menuItemNames: scope.attributes.menuItemNames.value,
                            menuItemsType: scope.attributes.menuItemsType.value
                        }
                    });
                }

                scope.menu = {};
                if(scope.attributes.layoutType.value === 'none' ){
                    scope.attributes.menuItems.status = "overridden";
                }
                scope.menuEditorTabs = {"activeTab": 0};
                scope.statable = {"value": false};
                scope.waitable = {"value": false};
                scope.waitableItem = { "value": false};
                scope.isFabToolbar = {"value": false};
                if (scope.attributes.layoutType.value === 'wizard' || scope.attributes.layoutType.value === 'tabs' || scope.attributes.layoutType.value === 'panel'){
                    scope.toolbarSide = $(ev.target).attr('side');
                    if (scope.toolbarSide === 'left'){
                        scope.menuItemsType.value = scope.attributes.toolbar.leftMenu.menuItemsType.value;
                        scope.menuItemNames.value = scope.attributes.toolbar.leftMenu.menuItemNames.value;
                        scope.menuItems = scope.attributes.toolbar.leftMenu.menuItems;
                        scope.$parent.overrideAttribute('toolbar.leftMenu.menuItems');
                        scope.$parent.overrideAttribute('toolbar.leftMenu.menuItemsType');
                        scope.$parent.overrideAttribute('toolbar.leftMenu.menuItemNames');
                        if (scope.attributes.toolbar.leftMenu.type.value === 'Icon Bar'){
                            scope.statable.value = true;
                            scope.waitable.value = false;
                            scope.isFabToolbar.value = false;
                            scope.dialogGcType = 'iconbar';
                        } else if (scope.attributes.toolbar.leftMenu.type.value === 'Buttons') {
                            scope.statable.value = false;
                            scope.waitable.value = true;
                            scope.isFabToolbar.value = false;
                            scope.dialogGcType = 'button';
                        } else if (scope.attributes.toolbar.leftMenu.type.value === 'Fab') {
                            scope.statable.value = false;
                            scope.waitable.value = false;
                            scope.isFabToolbar.value = true;
                            scope.dialogGcType = 'fab';
                        }
                    } else {
                        scope.menuItemsType.value = scope.attributes.toolbar.rightMenu.menuItemsType.value;
                        scope.menuItemNames.value = scope.attributes.toolbar.rightMenu.menuItemNames.value;
                        scope.menuItems = scope.attributes.toolbar.rightMenu.menuItems;
                        scope.$parent.overrideAttribute('toolbar.rightMenu.menuItems');
                        scope.$parent.overrideAttribute('toolbar.rightMenu.menuItemsType');
                        scope.$parent.overrideAttribute('toolbar.rightMenu.menuItemNames');
                        if (scope.attributes.toolbar.rightMenu.type.value === 'Icon Bar'){
                            scope.statable.value = true;
                            scope.waitable.value = false;
                            scope.isFabToolbar.value = false;
                            scope.dialogGcType = 'iconbar';
                        } else if (scope.attributes.toolbar.rightMenu.type.value === 'Buttons') {
                            scope.statable.value = false;
                            scope.waitable.value = true;
                            scope.isFabToolbar.value = false;
                            scope.dialogGcType = 'button';
                        } else if (scope.attributes.toolbar.rightMenu.type.value === 'Fab') {
                            scope.statable.value = false;
                            scope.waitable.value = false;
                            scope.isFabToolbar.value = true;
                            scope.dialogGcType = 'fab';
                        }
                    }
                } else {
                    if (scope.attributes.menuItemsType.value == 'dynamic') {
                        scope.attributes.menuItemNames.status = "overridden";
                    }

                    scope.menuItems = scope.attributes.menuItems;
                    scope.gc_selected.type === 'iconbar' ? scope.statable.value = true : scope.statable.value = false;
                    scope.menuItemNames.value = scope.attributes.menuItemNames.value;
                    scope.menuItemsType.value = scope.attributes.menuItemsType.value;
                    scope.dialogGcType = scope.gc_selected.type;
                }
                $mdDialog.show({
                    scope: scope.$new(),
                    parent: angular.element(document.body),
                    targetEvent: ev,
                    clickOutsideToClose:true,
                    escapeToClose: false,
                    ariaLabel: 'menu-editor',
                    templateUrl: '/gcontrols/web/menu_editor.html',
                    onComplete: function() {
                        $('#dfx-ve-menu-editor-dialog').keyup(function(e) {
                            if(e.which === 13 && $('#dfx-ve-expression-menu-dialog').length === 0) {
                                if(document.activeElement.tagName!=='BUTTON')  scope.closeDialog();
                            }
                            if(e.which === 27) scope.closeDialog();
                            e.preventDefault();
                            e.stopPropagation();
                        });
                        $timeout(function(){
                            if(scope.menuItems.value.length>0) {
                                scope.menu = scope.menuItems.value[0];
                                scope.indexMenuItem = '';
                                if ( scope.menu ) {
                                    scope.ifShowMenuIconTypes(scope.menu.icon.value);
                                    scope.setMenuItemType();
                                    scope.waitableItem.value = scope.menu.hasOwnProperty('waiting') ? true : false;
                                }
                                if ( scope.statable.value && scope.menu.state && scope.menu.state.value ) {
                                    scope.ifShowMenuIconTypes( scope.menu.state.checkedIcon.value, 'checked' );
                                    scope.ifShowMenuIconTypes( scope.menu.state.uncheckedIcon.value, 'unchecked' );
                                    $timeout(function() {
                                        scope.menuEditorTabs.activeTab = 1;
                                    }, 100);
                                }
                                if ( scope.waitable.value && scope.menu.waiting && scope.menu.waiting.value ) {
                                    scope.ifShowMenuIconTypes( scope.menu.waiting.icon.value, 'waiting' );
                                    $timeout(function() {
                                        scope.menuEditorTabs.activeTab = 1;
                                    }, 100);
                                }
                            }
                        }, 0);
                        $timeout(function() {
                            scope.indexMenuItem = 0;
                            scope.arrayElement = scope.menuItems.value;
                            scope.gcMenuItems = $("md-content.menu-structure").find('li');
                            $("md-content.menu-structure > ul > li:first-child").addClass('active');
                            scope.parentMenuItem = $("md-content.menu-structure").find('li.active');
                        }, 0);
                    },
                    controller: function(){
                        scope.menuEditorItem = {};
                        scope.bridge = '.menuItems.value';
                        scope.setMenuItemsType = function( type ){
                            if(scope.toolbarSide === 'left'){
                                if (type == 'static') {
                                    scope.attributes.toolbar.leftMenu.menuItems.status = "overridden";
                                    scope.attributes.toolbar.leftMenu.menuItemNames.status = "";
                                } else if (type == 'dynamic') {
                                    scope.attributes.toolbar.leftMenu.menuItems.status = "";
                                    scope.attributes.toolbar.leftMenu.menuItemNames.status = "overridden";
                                }
                                scope.attributes.toolbar.leftMenu.menuItemsType.value = type;
                                scope.$parent.overrideAttribute('toolbar.leftMenu.menuItemsType');
                            }else if(scope.toolbarSide === 'right'){
                                if (type == 'static') {
                                    scope.attributes.toolbar.rightMenu.menuItems.status = "overridden";
                                    scope.attributes.toolbar.rightMenu.menuItemNames.status = "";
                                } else if (type == 'dynamic') {
                                    scope.attributes.toolbar.rightMenu.menuItems.status = "";
                                    scope.attributes.toolbar.rightMenu.menuItemNames.status = "overridden";
                                }
                                scope.attributes.toolbar.rightMenu.menuItemsType.value = type;
                                scope.$parent.overrideAttribute('toolbar.rightMenu.menuItemsType');
                            } else {
                                if (type == 'static') {
                                    scope.attributes.menuItems.status = "overridden";
                                    scope.attributes.menuItemNames.status = "";
                                } else if (type == 'dynamic') {
                                    scope.attributes.menuItems.status = "";
                                    scope.attributes.menuItemNames.status = "overridden";
                                }
                                scope.attributes.menuItemsType.value = type;
                                scope.$parent.overrideAttribute('menuItemsType');
                            }
                        }
                        scope.checkMenuIconTypes = function() {
                            if ( scope.statable.value && scope.menu.state && scope.menu.state.value ) {
                                scope.ifShowMenuIconTypes( scope.menu.state.checkedIcon.value, 'checked' );
                                scope.ifShowMenuIconTypes( scope.menu.state.uncheckedIcon.value, 'unchecked' );
                            }
                            if ( scope.waitable.value && scope.menu.waiting && scope.menu.waiting.value ) {
                                scope.ifShowMenuIconTypes( scope.menu.waiting.icon.value, 'waiting' );
                            }
                        }
                        scope.checkMenuRootPadding = function() {
                            $timeout(function() {
                                var root_togglers = $('.menu-structure > ul > li > span').length;

                                root_togglers>0 ? $('.menu-structure > ul').css('padding-left', '16px') : $('.menu-structure > ul').css('padding-left', '0px');
                            }, 0);
                        }
                        scope.checkMenuRootPadding();
                        scope.selectMenuItem = function(ev, menuItem) {
                            scope.menu = menuItem;
                            scope.selectedMenuItem = ev.target,
                            scope.selfParents = $(scope.selectedMenuItem).parents('li.menu-tree-item'),
                            scope.levelMenuItem = scope.selfParents.length,
                            scope.parentMenuItem = $(scope.selectedMenuItem).parent();
                            scope.indexMenuItem = scope.parentMenuItem.index();
                            scope.indexParentMenuItem = '';
                            scope.gcMenuItems = $("md-content.menu-structure").find('li');
                            scope.arrayElement = '';
                            scope.indentPath = '';
                            scope.outdentPath = '';
                            scope.gcMenuItems.removeClass('active');
                            scope.parentMenuItem.addClass('active');
                            scope.selfParents.each(function(index, element){
                                if (index === 0) {
                                    scope.arrayElement = scope.bridge;
                                    scope.indexParentMenuItem = $(element).attr('parent-index');
                                    var indendIndex = $(element).attr('self-index') - 1;
                                    scope.indentPath = scope.bridge + '[' + indendIndex + ']' + scope.bridge;
                                    if ($(element).attr('self-index') > 0) {
                                        scope.canIndent = true;
                                    } else {
                                        scope.canIndent = false;
                                    }
                                } else if (index === 1) {
                                    scope.indentPath = scope.bridge + '[' + $(element).attr('self-index') + ']' + scope.indentPath;
                                    scope.outdentPath = scope.bridge;
                                    scope.arrayElement = scope.bridge + '[' + $(element).attr('self-index') + ']' + scope.arrayElement;

                                } else {
                                    scope.arrayElement = scope.bridge + '[' + $(element).attr('self-index') + ']' + scope.arrayElement;
                                    scope.indentPath = scope.bridge + '[' + $(element).attr('self-index') + ']' + scope.indentPath;
                                    scope.outdentPath = scope.bridge + '[' + $(element).attr('self-index') + ']' + scope.outdentPath;
                                }
                            })
                            scope.arrayElement = eval('scope' + scope.arrayElement);
                            scope.outdentPath = eval('scope' + scope.outdentPath);
                            scope.ifShowMenuIconTypes(scope.menu.icon.value);
                            if ( scope.statable.value && scope.menu.state && scope.menu.state.value ) {
                                scope.ifShowMenuIconTypes( scope.menu.state.checkedIcon.value, 'checked' );
                                scope.ifShowMenuIconTypes( scope.menu.state.uncheckedIcon.value, 'unchecked' );
                                $timeout(function() {
                                    scope.menuEditorTabs.activeTab = 1;
                                }, 100);
                            }
                            // if ( scope.menuEditorTabs.activeTab !== 0 ) { scope.menuEditorTabs.activeTab = 0; }
                            scope.setMenuItemType();
                            scope.waitableItem.value = scope.menu.hasOwnProperty('waiting') ? true : false;
                            if ( scope.waitable.value && scope.menu.waiting && scope.menu.waiting.value ) {
                                scope.ifShowMenuIconTypes( scope.menu.waiting.icon.value, 'waiting' );
                            }
                            scope.checkMenuRootPadding();
                        }
                        scope.toggleMenuItem = function(ev){
                            var entity_trigger = $(ev.target),
                                entity_container = entity_trigger.parent().siblings('ul');

                            entity_trigger.hasClass('collapsed') ? entity_trigger.removeClass('collapsed') : entity_trigger.addClass('collapsed');
                            entity_container.slideToggle();
                        }
                        scope.addMenuItem = function() {
                            var menuItemTemplate = {
                                "label": "'New item'",
                                "shortcut": "",
                                "divider": false,
                                "icon": { "value": "'home'", "type": "svg-icon" },
                                "notification": "",
                                "display": "true",
                                "disabled": "false",
                                "onclick": "",
                                "menuItems": { "value": [] }
                            }
                            if ( scope.menuItems.value.length > 0 ) {
                                angular.forEach(scope.arrayElement, function(obj, index){
                                    if (index === scope.indexMenuItem) {
                                        scope.arrayElement.splice(index+1, 0, menuItemTemplate);
                                        return;
                                    };
                                });
                                $timeout(function() {
                                    scope.indexMenuItem = scope.indexMenuItem + 1;
                                    scope.menu = scope.arrayElement[scope.indexMenuItem];
                                    var currentItem = $("md-content.menu-structure").find('li.active');
                                    $("md-content.menu-structure").find('li').removeClass('active');
                                    currentItem.next().addClass('active');
                                    scope.parentMenuItem = scope.parentMenuItem.next();
                                }, 0);
                            } else {
                                scope.menuItems.value.push(menuItemTemplate);
                                $timeout(function() {
                                    scope.arrayElement = scope.menuItems.value;
                                    scope.indexMenuItem = 0;
                                    scope.parentMenuItem = $("md-content.menu-structure li.menu-tree-item");
                                    $(scope.parentMenuItem).addClass('active');
                                    scope.menu = scope.menuItems.value[0];
                                }, 0);
                            }
                            scope.menuEditorItem.type = 'standard';
                            $timeout(function() {
                                scope.waitableItem.value = scope.menu.hasOwnProperty('waiting') ? true : false;
                            }, 250);
                            scope.checkMenuRootPadding();
                        }
                        scope.deleteMenuItem = function() {
                            if ( scope.menuItems.value.length > 0 ) {
                                if ( scope.arrayElement.length > 1 ) {
                                    $timeout(function() {
                                        if ( scope.arrayElement.length === scope.indexMenuItem + 1 ) {
                                            scope.parentMenuItem = $("md-content.menu-structure").find('li.active').prev();
                                            scope.arrayElement.splice(scope.indexMenuItem, 1);
                                            scope.indexMenuItem = scope.indexMenuItem - 1;
                                            scope.menu = scope.arrayElement[scope.indexMenuItem];
                                            $("md-content.menu-structure").find('li').removeClass('active');
                                            scope.parentMenuItem.addClass('active');
                                            scope.setMenuItemType();
                                        } else {
                                            scope.arrayElement.splice(scope.indexMenuItem, 1);
                                            scope.menu = scope.arrayElement[scope.indexMenuItem];
                                            scope.setMenuItemType();
                                        }
                                    }, 0);
                                } else {
                                    scope.arrayElement.splice(scope.indexMenuItem, 1);
                                    scope.parents = $(scope.parentMenuItem).parents('li.menu-tree-item');
                                    scope.menuLevel = scope.parents.length;
                                    scope.parentMenuItem = scope.parents.first();
                                    scope.indexMenuItem = scope.parentMenuItem.index();
                                    scope.parentMenuItem.addClass('active');
                                    scope.arrayElement = '';
                                    scope.parents.each(function(index, element){
                                        if ( index === 0 ) {
                                            scope.arrayElement = scope.bridge;
                                        } else {
                                            scope.arrayElement = scope.bridge + '[' + $(element).attr('self-index') + ']' + scope.arrayElement;
                                        }
                                    });
                                    scope.arrayElement = eval('scope' + scope.arrayElement);
                                    scope.menu = scope.arrayElement[scope.indexMenuItem];
                                }
                            }
                            $timeout(function() {
                                if (scope.menu) {
                                    scope.waitableItem.value = scope.menu.hasOwnProperty('waiting') ? true : false;
                                }
                            }, 250);
                            scope.checkMenuRootPadding();
                        }
                        Array.prototype.move = function(from,to){
                            scope.gcMenuItems.removeClass('active');
                            this.splice(to,0,this.splice(from,1)[0]);
                            return this;
                        };
                        scope.moveUpMenuItem = function() {
                            if ( scope.indexMenuItem > 0 ) {
                                $timeout(function() {
                                    scope.arrayElement.move(scope.indexMenuItem - 1,scope.indexMenuItem).join(',');
                                    scope.indexMenuItem = scope.indexMenuItem - 1;
                                    $("md-content.menu-structure").find('li').removeClass('active');
                                    scope.parentMenuItem = scope.parentMenuItem.prev();
                                    scope.parentMenuItem.addClass('active');
                                    scope.setMenuItemType();
                                }, 0);
                            }
                            scope.checkMenuRootPadding();
                        }
                        scope.moveDownMenuItem = function() {
                            if ( scope.indexMenuItem !== scope.arrayElement.length-1 && angular.isNumber(scope.indexMenuItem) === true ) {
                                scope.arrayElement.move(scope.indexMenuItem,scope.indexMenuItem + 1).join(',');
                                scope.indexMenuItem = scope.indexMenuItem + 1;
                                $("md-content.menu-structure").find('li').removeClass('active');
                                scope.parentMenuItem = scope.parentMenuItem.next();
                                scope.parentMenuItem.addClass('active');
                                scope.setMenuItemType();
                            }
                            scope.checkMenuRootPadding();
                        }
                        scope.indentMenuItem = function() {
                            if ( scope.gc_selected.type !== 'fab' && !scope.isFabToolbar.value ) {
                                if ( scope.parentMenuItem.index() > 0 ) {
                                    scope.arrayElement[scope.parentMenuItem.index()-1].menuItems.value.push(scope.arrayElement[scope.parentMenuItem.index()]);
                                    var toSplice = scope.parentMenuItem.index();
                                    scope.parentMenuItem = $(scope.parentMenuItem).prev();
                                    scope.arrayElement.splice(toSplice, 1);
                                    scope.arrayElement = scope.arrayElement[toSplice-1].menuItems.value;
                                    $timeout(function() {
                                        $("md-content.menu-structure").find('li').removeClass('active');
                                        scope.indexMenuItem = scope.arrayElement.length - 1;
                                        $(scope.parentMenuItem).children('ul').find('li').last().addClass('active');
                                        scope.parentMenuItem = $("md-content.menu-structure").find('li.active');
                                        scope.setMenuItemType();
                                        $timeout(function() {
                                            scope.waitableItem.value = scope.menu.hasOwnProperty('waiting') ? true : false;
                                        }, 250);
                                    }, 0);
                                }
                            } else {
                                $mdToast.show(
                                    $mdToast.simple()
                                        .theme('warn-toast')
                                        .textContent("FAB items can't be indented")
                                        .position('top right')
                                        .hideDelay(3000)
                                );
                            }
                            scope.checkMenuRootPadding();
                        }
                        scope.outdentMenuItem = function() {
                            if ( scope.gc_selected.type !== 'fab' && !scope.isFabToolbar.value ) {
                                scope.parents = $(scope.parentMenuItem).parents('li.menu-tree-item');
                                if ( scope.parents.length > 0 ) {
                                    scope.outdentElement = scope.arrayElement[scope.indexMenuItem];
                                    scope.arrayElement.splice(scope.indexMenuItem, 1);
                                    scope.arrayElement = '';
                                    scope.parents.each(function(index, element){
                                        if ( index === 0 ) {
                                            scope.arrayElement = scope.bridge;
                                            scope.parentMenuItem = $(element);
                                            scope.indexMenuItem = $(scope.parentMenuItem).index() + 1;
                                        } else {
                                            scope.arrayElement = scope.bridge + '[' + $(element).attr('self-index') + ']' + scope.arrayElement;
                                        }
                                    });
                                    $("md-content.menu-structure").find('li').removeClass('active');
                                    scope.arrayElement = eval('scope' + scope.arrayElement);
                                    scope.arrayElement.splice(scope.indexMenuItem, 0, scope.outdentElement);
                                    $timeout(function() {
                                        scope.parentMenuItem = $(scope.parentMenuItem).next();
                                        $(scope.parentMenuItem).addClass('active');
                                        scope.setMenuItemType();
                                        $timeout(function() {
                                            scope.waitableItem.value = scope.menu.hasOwnProperty('waiting') ? true : false;
                                        }, 250);
                                    }, 0);
                                }
                            } else {
                                $mdToast.show(
                                    $mdToast.simple()
                                        .theme('warn-toast')
                                        .textContent("FAB items can't be outdented")
                                        .position('top right')
                                        .hideDelay(3000)
                                );
                            }
                            scope.checkMenuRootPadding();
                        }
                        scope.ifShowMenuIconTypes = function( icon, type ) {
                            var regexp = /(^\')(.*)(\'$)/gm, filtered = regexp.exec( icon );
                            if ( icon && ( icon.indexOf('+') >= 0 ) ) { filtered = false; }
                            if ( icon === '' ) { filtered = true; }
                            if ( icon.indexOf("'") === 0 && icon.indexOf('+') === -1 && icon.charAt(icon.length-1) === "'" && !type ) {
                                icon.indexOf("'fa-") === 0 ? scope.menu.icon.type = 'fa-icon' : scope.menu.icon.type = 'svg-icon';
                            } else if ( icon.indexOf("'") === 0 && icon.indexOf('+') === -1 && icon.charAt(icon.length-1) === "'" && type !== '' ) {
                                switch ( type ) {
                                    case 'checked': icon.indexOf("'fa-") === 0 ? scope.menu.state.checkedIcon.type = 'fa-icon' : scope.menu.state.checkedIcon.type = 'svg-icon'; break;
                                    case 'unchecked': icon.indexOf("'fa-") === 0 ? scope.menu.state.uncheckedIcon.type = 'fa-icon' : scope.menu.state.uncheckedIcon.type = 'svg-icon'; break;
                                    case 'waiting': icon.indexOf("'fa-") === 0 ? scope.menu.waiting.icon.type = 'fa-icon' : scope.menu.waiting.icon.type = 'svg-icon'; break;
                                    case 'actions': icon.indexOf("'fa-") === 0 ? scope.menu.actions.icon.type = 'fa-icon' : scope.menu.actions.icon.type = 'svg-icon'; break;
                                    case 'actionItem': icon.indexOf("'fa-") === 0 ? scope.actionItem.icon.type = 'fa-icon' : scope.actionItem.icon.type = 'svg-icon'; break;
                                }
                            }
                            if ( !type ) {
                                scope.showIconTypes = filtered ? false : true;
                            } else if ( type !== '' ) {
                                switch ( type ) {
                                    case 'checked': scope.showCheckedIconTypes = filtered ? false : true; break;
                                    case 'unchecked': scope.showUncheckedIconTypes = filtered ? false : true; break;
                                    case 'waiting': scope.showWaitingIconTypes = filtered ? false : true; break;
                                    case 'actions': scope.showActionsIconTypes = filtered ? false : true; break;
                                    case 'actionItem': scope.showActionItemIconTypes = filtered ? false : true; break;
                                }
                            }
                        }
                        scope.setMenuItemType = function( menuType ) {
                            $timeout(function() {
                                if ( menuType ) {
                                    switch ( menuType ) {
                                        case 'title':
                                            scope.menu.title = true;
                                            scope.menu.divider = false;
                                            if(scope.menu.state){scope.menu.state.value = false;}
                                            break;
                                        case 'divider':
                                            scope.menu.title = false;
                                            scope.menu.divider = true;
                                            if(scope.menu.state){scope.menu.state.value = false;}
                                            break;
                                        case 'selection':
                                            scope.menu.title = false;
                                            scope.menu.divider = false;
                                            if(scope.menu.state){scope.menu.state.value = true;}
                                            scope.menuEditorTabs.activeTab = 1;
                                            break;
                                        default:
                                            scope.menu.title = false;
                                            scope.menu.divider = false;
                                            if(scope.menu.state){scope.menu.state.value = false;}
                                    }
                                } else {
                                    scope.menuEditorItem = { "type": "" };
                                    if ( scope.menu.title === true ) { scope.menuEditorItem.type = 'title'; }
                                    else if ( scope.menu.divider === true ) { scope.menuEditorItem.type = 'divider'; }
                                    else if ( scope.statable.value && scope.menu.state && scope.menu.state.value === true ) { scope.menuEditorItem.type = 'selection'; scope.menuEditorTabs.activeTab = 1; }
                                    else { scope.menuEditorItem.type = 'standard'; }
                                }
                            }, 0);
                        }
                        scope.checkActions = function(menu){
                            if(!menu.actions.hasOwnProperty('icon')) menu.actions.icon = {"value": "", "type": "", "style": "", "class": ""};
                            if(!menu.actions.hasOwnProperty('actionItems')) menu.actions.actionItems = [];
                            if(!menu.actions.hasOwnProperty('onclick')) menu.actions.onclick = "";
                        }
                        scope.setActiveActionItem = function(index){
                            if(scope.menu.actions.actionItems.length>0){
                                scope.actionActiveIndex = index;
                                scope.actionItem = scope.menu.actions.actionItems[index];
                                $timeout(function() {
                                    $('.actions-structure li').removeClass('active');
                                    $('.actions-structure li').eq(index).addClass('active');
                                    scope.ifShowMenuIconTypes(scope.actionItem.icon.value, 'actionItem');
                                }, 0);
                            }else{
                                scope.actionItem = {};
                            }
                        }
                        scope.addActionItem = function() {
                            var actionItemTemplate = {
                                "label": "'New action item'",
                                "type": "standard",
                                "icon": { "value": "'home'", "type": "svg-icon" },
                                "display": "true",
                                "disabled": "false",
                                "onclick": ""
                            }
                            if(scope.menu.actions.actionItems.length>0){
                                ++scope.actionActiveIndex;
                                scope.menu.actions.actionItems.splice(scope.actionActiveIndex, 0, actionItemTemplate);
                            }else{
                                scope.menu.actions.actionItems.push(actionItemTemplate);
                            }
                            scope.setActiveActionItem(scope.actionActiveIndex);
                            scope.checkMenuRootPadding();
                        }
                        scope.deleteActionItem = function(){
                            if(scope.menu.actions.actionItems.length>0){
                                scope.menu.actions.actionItems.splice(scope.actionActiveIndex, 1);
                                if(scope.actionActiveIndex===scope.menu.actions.actionItems.length && scope.actionActiveIndex>0) --scope.actionActiveIndex;
                                scope.setActiveActionItem(scope.actionActiveIndex);
                            }
                            scope.checkMenuRootPadding();
                        }
                        scope.moveUpActionItem = function(){
                            if(scope.menu.actions.actionItems.length>1 && scope.actionActiveIndex>0){
                                var tempActiveItem = scope.actionItem;
                                scope.menu.actions.actionItems.splice(scope.actionActiveIndex, 1);
                                --scope.actionActiveIndex;
                                scope.menu.actions.actionItems.splice(scope.actionActiveIndex, 0, tempActiveItem);
                                scope.setActiveActionItem(scope.actionActiveIndex);
                            }
                            scope.checkMenuRootPadding();
                        }
                        scope.moveDownActionItem = function(){
                            if(scope.menu.actions.actionItems.length>0 && scope.actionActiveIndex<scope.menu.actions.actionItems.length-1){
                                var tempActiveItem = scope.actionItem;
                                scope.menu.actions.actionItems.splice(scope.actionActiveIndex, 1);
                                ++scope.actionActiveIndex;
                                scope.menu.actions.actionItems.splice(scope.actionActiveIndex, 0, tempActiveItem);
                                scope.setActiveActionItem(scope.actionActiveIndex);
                            }
                            scope.checkMenuRootPadding();
                        }
                        scope.setActionsMode = function(){
                            scope.actionsMode.value=true;
                            scope.actionActiveIndex = 0;
                            if(scope.menu.actions.actionItems.length>0) scope.setActiveActionItem(scope.actionActiveIndex);
                        }
                        scope.leaveActionsMode = function(){
                            scope.actionsMode.value=false;
                        }
                        scope.gcJsonSample = {};
                        scope.gcSamplesArray = {};
                        scope.tempItemNames = {};
                        scope.scriptSampleName = '';
                        scope.scriptSampleNameValid = {"value": false};
                        scope.focusSamples = function(){$timeout(function(){$("#samples-btn").focus();},100);}
                        scope.runJsonEditor = function(model){
                            scope.dfxSampleJsonEditor = null;
                            var container = document.getElementById('dfx-ve-sample-json'),
                                options = { mode: 'code', modes: ['tree','form','code','text','view'], history: true }
                            $timeout(function(){scope.dfxSampleJsonEditor = new JSONEditor(container, options, model);}, 0);
                        }
                        scope.checkMainNames = function( propName ){
                            if (!scope.tempItemNames.hasOwnProperty('main')) scope.tempItemNames.main = {"source": ""};
                            switch (propName) {
                                case 'type': if(!scope.tempItemNames.main.hasOwnProperty('type')){scope.tempItemNames.main.type = 'type';} break;
                                case 'label': if(!scope.tempItemNames.main.hasOwnProperty('label')){scope.tempItemNames.main.label = 'label';} break;
                                case 'title': if(!scope.tempItemNames.main.hasOwnProperty('title')){scope.tempItemNames.main.title = 'title';} break;
                                case 'divider': if(!scope.tempItemNames.main.hasOwnProperty('divider')){scope.tempItemNames.main.divider = 'divider';} break;
                                case 'shortcut': if(!scope.tempItemNames.main.hasOwnProperty('shortcut')){scope.tempItemNames.main.shortcut = 'shortcut';} break;
                                case 'notification': if(!scope.tempItemNames.main.hasOwnProperty('notification')){scope.tempItemNames.main.notification = 'notification';} break;
                                case 'display': if(!scope.tempItemNames.main.hasOwnProperty('display')){scope.tempItemNames.main.display = 'display';} break;
                                case 'disabled': if(!scope.tempItemNames.main.hasOwnProperty('disabled')){scope.tempItemNames.main.disabled = 'disabled';} break;
                                case 'onclick': if(!scope.tempItemNames.main.hasOwnProperty('onclick')){scope.tempItemNames.main.onclick = 'onclick';} break;
                                case 'icon': if(!scope.tempItemNames.main.hasOwnProperty('icon')){scope.tempItemNames.main.icon = {"value": "icon"};} break;
                                case 'scopeItems': if(!scope.tempItemNames.main.hasOwnProperty('scopeItems')){scope.tempItemNames.main.scopeItems = 'scopeItems';} break;
                                case 'state': if(!scope.tempItemNames.hasOwnProperty('state')){scope.tempItemNames.state = {"name": "state"};} break;
                                case 'waiting': if(!scope.tempItemNames.hasOwnProperty('waiting')){scope.tempItemNames.waiting = {"name": "waiting"};} break;
                                case 'actions': if(!scope.tempItemNames.hasOwnProperty('actions')){scope.tempItemNames.actions = {"name": "actions"};} break;
                            }
                        }
                        scope.checkIconNames = function( icon, iconModeType ){
                            Object.getOwnPropertyNames(icon).forEach(function(iconProp) {
                                switch(iconModeType){
                                    case 'main':
                                        if(!scope.tempItemNames.main.icon.hasOwnProperty(iconProp)) scope.tempItemNames.main.icon[iconProp] = iconProp;                                        break;
                                    case 'checkedIcon':
                                        if(!scope.tempItemNames.state.hasOwnProperty('checkedIcon')) scope.tempItemNames.state.checkedIcon = {"value": "checkedIcon"};
                                        if(!scope.tempItemNames.state.checkedIcon.hasOwnProperty(iconProp)) scope.tempItemNames.state.checkedIcon[iconProp] = iconProp; break;
                                    case 'uncheckedIcon':
                                        if(!scope.tempItemNames.state.hasOwnProperty('uncheckedIcon')) scope.tempItemNames.state.uncheckedIcon = {"value": "uncheckedIcon"};
                                        if(!scope.tempItemNames.state.uncheckedIcon.hasOwnProperty(iconProp)) scope.tempItemNames.state.uncheckedIcon[iconProp] = iconProp; break;
                                    case 'waiting':
                                        if(!scope.tempItemNames.waiting.hasOwnProperty('icon')) scope.tempItemNames.waiting.icon = {"value": "icon"};
                                        if(!scope.tempItemNames.waiting.icon.hasOwnProperty(iconProp)) scope.tempItemNames.waiting.icon[iconProp] = iconProp; break;
                                    case 'actionObject':
                                        if(!scope.tempItemNames.actions.hasOwnProperty('icon')) scope.tempItemNames.actions.icon = {"value": "icon"};
                                        if(!scope.tempItemNames.actions.icon.hasOwnProperty(iconProp)) scope.tempItemNames.actions.icon[iconProp] = iconProp; break;
                                    case 'actionItem':
                                        if(!scope.tempItemNames.actions.actionItems.hasOwnProperty('icon')) scope.tempItemNames.actions.actionItems.icon = {"value": "icon"};
                                        if(!scope.tempItemNames.actions.actionItems.icon.hasOwnProperty(iconProp)) scope.tempItemNames.actions.actionItems.icon[iconProp] = iconProp; break;
                                }
                            });
                        }
                        scope.checkStateNames = function( state ){
                            Object.getOwnPropertyNames(state).forEach(function(stateProp) {
                                if(!scope.tempItemNames.state.hasOwnProperty(stateProp)){
                                    switch(stateProp){
                                        case 'binding': scope.tempItemNames.state[stateProp] = stateProp; break;
                                        case 'checkedIcon': scope.checkIconNames( state.checkedIcon, 'checkedIcon' ); break;
                                        case 'uncheckedIcon': scope.checkIconNames( state.uncheckedIcon, 'uncheckedIcon' ); break;
                                    }
                                }
                            });
                        }
                        scope.checkWaitingNames = function( waiting ){
                            Object.getOwnPropertyNames(waiting).forEach(function(waitingProp) {
                                if(!scope.tempItemNames.waiting.hasOwnProperty(waitingProp)) {
                                    switch(waitingProp){
                                        case 'binding': scope.tempItemNames.waiting[waitingProp] = waitingProp; break;
                                        case 'autoDisabled': scope.tempItemNames.waiting[waitingProp] = waitingProp;; break;
                                        case 'icon': scope.checkIconNames( waiting.icon, 'waiting' ); break;
                                    }
                                }
                            });
                        }
                        scope.checkActionItemNames = function( actionItem ){
                            Object.getOwnPropertyNames(actionItem).forEach(function(actionItemProp) {
                                if(!scope.tempItemNames.actions.actionItems.hasOwnProperty(actionItemProp)) {
                                    switch(actionItemProp){
                                        case 'type': scope.tempItemNames.actions.actionItems[actionItemProp] = actionItemProp; break;
                                        case 'label': scope.tempItemNames.actions.actionItems[actionItemProp] = actionItemProp; break;
                                        case 'display': scope.tempItemNames.actions.actionItems[actionItemProp] = actionItemProp; break;
                                        case 'disabled': scope.tempItemNames.actions.actionItems[actionItemProp] = actionItemProp; break;
                                        case 'onclick': scope.tempItemNames.actions.actionItems[actionItemProp] = actionItemProp; break;
                                        case 'icon': scope.checkIconNames( actionItem.icon, 'actionItem' ); break;
                                    }
                                }
                            });
                        }
                        scope.checkActionsNames = function( actionObject ){
                            Object.getOwnPropertyNames(actionObject).forEach(function(actionObjectProp) {
                                if(!scope.tempItemNames.actions.hasOwnProperty(actionObjectProp)) {
                                    switch(actionObjectProp){
                                        case 'icon': scope.checkIconNames( actionObject.icon, 'actionObject' ); break;
                                        case 'display': scope.tempItemNames.actions[actionObjectProp] = actionObjectProp; break;
                                        case 'disabled': scope.tempItemNames.actions[actionObjectProp] = actionObjectProp; break;
                                        case 'onclick': scope.tempItemNames.actions[actionObjectProp] = actionObjectProp; break;
                                        case 'actionItems':
                                            if(!scope.tempItemNames.actions.hasOwnProperty('actionItems')) scope.tempItemNames.actions.actionItems = {"name": actionObjectProp};
                                            if(actionObject.actionItems.length>0){
                                                for (var i = 0; i < actionObject.actionItems.length; i++) {
                                                    scope.checkActionItemNames(actionObject.actionItems[i]);
                                                };
                                            }
                                            break;
                                    }
                                }
                            });
                        }
                        scope.checkItemNames = function( item ) {
                            if(item.hasOwnProperty('type')){scope.checkMainNames('type');}
                            if(item.hasOwnProperty('label')){scope.checkMainNames('label');}
                            if(item.hasOwnProperty('title')){scope.checkMainNames('title');}
                            if(item.hasOwnProperty('divider')){scope.checkMainNames('divider');}
                            if(item.hasOwnProperty('shortcut')){scope.checkMainNames('shortcut');}
                            if(item.hasOwnProperty('notification')){scope.checkMainNames('notification');}
                            if(item.hasOwnProperty('display')){scope.checkMainNames('display');}
                            if(item.hasOwnProperty('disabled')){scope.checkMainNames('disabled');}
                            if(item.hasOwnProperty('onclick')){scope.checkMainNames('onclick');}
                            if(item.hasOwnProperty('scopeItems')){
                                scope.checkMainNames('scopeItems');
                                if(item.scopeItems.length>0){
                                    for (var i = 0; i < item.scopeItems.length; i++) {
                                        scope.checkItemNames(item.scopeItems[i]);
                                    };
                                }
                            }
                            if(item.hasOwnProperty('icon')){ scope.checkMainNames('icon'); scope.checkIconNames(item.icon, 'main'); }
                            if(item.hasOwnProperty('state')){ scope.checkMainNames('state'); scope.checkStateNames(item.state); }
                            if(item.hasOwnProperty('waiting')){ scope.checkMainNames('waiting'); scope.checkWaitingNames(item.waiting); }
                            if(item.hasOwnProperty('actions')){ scope.checkMainNames('actions'); scope.checkActionsNames(item.actions); }
                            $q.all([ scope.checkItemNames, scope.checkMainNames, scope.checkIconNames, scope.checkStateNames, scope.checkWaitingNames, scope.checkActionsNames, scope.checkActionItemNames ]).then(function(){
                                scope.menuItemNames.value = scope.tempItemNames;
                                if(scope.toolbarSide){
                                    if(scope.toolbarSide ==='left'){
                                        scope.attributes.toolbar.leftMenu.menuItemNames.value = scope.tempItemNames;
                                    }else{
                                        scope.attributes.toolbar.rightMenu.menuItemNames.value = scope.tempItemNames;
                                    }
                                }else{
                                    scope.attributes.menuItemNames.value = scope.tempItemNames;
                                }
                            });
                        }
                        scope.fillPropertiesNames = function(sampleJson){for(var i = 0; i<sampleJson.length; i++){scope.checkItemNames(sampleJson[i]);};}
                        scope.showSamples = function(){
                            scope.samplesLoaded = $http.get('/gcontrols/web/gcs_json_samples.json').then(function(res){
                                scope.gcSamplesArray = res.data[scope.dialogGcType];
                                scope.gcJsonSample = scope.gcSamplesArray[0];
                            });
                            $q.all([scope.samplesLoaded]).then(function(){
                                $('body').append('<div class="dfx-ve-dialog"></div>');
                                $('.dfx-ve-dialog').load('/gcontrols/web/gcs_json_samples.html', function(){
                                    $compile($('.dfx-ve-dialog').contents())(scope);
                                    $('.sp-container').remove();
                                    $('.dfx-ve-content-dialog').addClass('active');
                                    $('#dfx-ve-gc-samples-dialog').keyup(function(e) {
                                        if(e.which === 13) {
                                            var activeTagName = document.activeElement.tagName;
                                            if(activeTagName!=='TEXTAREA' && activeTagName!=='BUTTON') $('#dfx-copy-sample-btn').click();
                                        }
                                        if(e.which === 27) scope.closeSamples();
                                        e.preventDefault();
                                        e.stopPropagation();
                                    });
                                    $timeout(function(){
                                        scope.runJsonEditor(scope.gcSamplesArray[0].value);
                                        $(".dfx-ve-content-categories li").eq(0).find('span').addClass('active');
                                        scope.scriptSampleName!=='' ? $("#dfx-copy-sample-btn").focus() : $("#dfx-json-sample-name").focus();
                                    }, 250);
                                });
                            });
                        }
                        scope.selectSample = function(ev, sample) {
                            scope.gcJsonSample = sample;
                            scope.dfxSampleJsonEditor ? scope.dfxSampleJsonEditor.set(sample.value) : scope.runJsonEditor(sample.value);
                            $(".dfx-ve-content-categories span").removeClass('active');
                            $(ev.target).addClass('active');
                            scope.scriptSampleName!=='' ? $("#dfx-copy-sample-btn").focus() : $("#dfx-json-sample-name").focus();
                        }
                        scope.addSampleToScript = function(){
                            scope.fillPropertiesNames(scope.gcJsonSample.value);
                            var sampleGet = scope.dfxSampleJsonEditor.get(),
                                sampleStringified = JSON.stringify(sampleGet, null, '\t'),
                                sampleStringified = sampleStringified.split("\n").join("\n\t"),
                                scriptEditor = $('#dfx_script_editor.CodeMirror')[0].CodeMirror;
                            $q.all([ scope.fillPropertiesNames ]).then(function(){
                                scope.tempItemNames.main.source = scope.scriptSampleName;
                                scope.closeDialog();
                                scope.closeSamples();
                                $timeout(function(){
                                    scope.changeViewMode('script');
                                    scriptEditor.focus();
                                    scriptEditor.setCursor({line: 4, ch: 0});
                                    var sampleToAdd = "\t$scope." + scope.scriptSampleName + " = " + sampleStringified + ";\n";
                                    scriptEditor.replaceSelection(sampleToAdd);
                                    scope.changeViewMode('design');
                                    $mdToast.show(
                                        $mdToast.simple()
                                        .textContent('JSON Sample "'+scope.gcJsonSample.name+'" has been added to the Script.')
                                        .theme('success-toast')
                                        .position('top right')
                                        .hideDelay(3000)
                                    );
                                    scope.closeDialog();
                                    scope.tempItemNames = {};
                                }, 250);
                            });
                        }
                        scope.closeDialog = function(){
                            // needed for UNDO functionality
                            scope.$parent.cacheAttributeNewValue({
                                'value': {
                                    menuItems: scope.menuItems.value,
                                    menuItemNames: scope.menuItemNames.value,
                                    menuItemsType: scope.menuItemsType.value
                                },
                                'group': true
                            });

                            $mdDialog.hide();
                        }
                        scope.closeSamples = function() {
                            $('.dfx-ve-content-dialog').removeClass('active');
                            angular.element($('.dfx-ve-dialog')).remove();
                            $('.sp-container').remove();
                            if($('#dfx-ve-menu-editor-dialog').length > 0) $('#dfx-ve-menu-editor-dialog').focus();
                        }
                    }
                })
            };
        }
    }
}]);

dfxViewEditorApp.directive('dfxVeMenuIcons', [ '$http', '$timeout', '$compile', '$filter', function($http, $timeout, $compile, $filter) {
    return {
        restrict: 'E',
        transclude: true,
        replace: true,
        templateUrl: function(el, attrs) {
            return '/gcontrols/web/picker_menu_icon.html';
        },
        controller: function($scope, $element, $attrs) {
            $scope.faIcons = [];
            $http.get('/gcontrols/web/picker_icon.json').then(function(res){
                for ( var i = 0; i < res.data.faClasses.length; i++ ) {
                    var faResIcon = { "value": res.data.faClasses[i], "category": "'fa-icons'", "type": "fa-icon" };
                    $scope.faIcons.push( faResIcon );
                }
            });
            $scope.svgCategories = [];
            $scope.svgIcons = [];
            $http.get('/gcontrols/web/mdicons.json').then(function(res){
                for ( var i = 0; i < res.data.length; i++ ) {
                    $scope.svgCategories.push( res.data[i].type );
                    for ( var j = 0; j < res.data[i].items.length; j++ ) {
                        var svgResIcon = { "value": res.data[i].items[j], "category": "'"+res.data[i].type+"','svg-icons'", "type": "svg-icon" };
                        $scope.svgIcons.push( svgResIcon );
                    }
                }
            });
            $timeout(function(){
                $scope.dfxIconsList = $scope.svgIcons.concat($scope.faIcons);
                $scope.dfxFilteredIconsList = $scope.dfxIconsList;
            }, 250);
            $scope.targetItem = {};
            $scope.iconsCategory = '';
            $scope.chooseIconsCategory = function( iconCategory, ev ) {
                $scope.dfxIconsList = $filter('filter')($scope.dfxFilteredIconsList, "'"+iconCategory+"'", 'strict');
                switch ( iconCategory ) {
                    case 'svg-icons': $scope.iconsCategory = '/ ' + 'SVG Icons'; break;
                    case 'fa-icons': $scope.iconsCategory = '/ ' + 'Font Awesome Icons'; break;
                    default: $scope.iconsCategory = '/ ' + iconCategory;
                }
                $(".dfx-ve-content-categories span").removeClass('active');
                $(ev.target).addClass('active');
            }
            $scope.searchIcons = function( icon ) {
                $scope.dfxIconsList = $filter('filter')($scope.dfxFilteredIconsList, icon, 'strict');
                $scope.iconsCategory = '| ' + icon;
                $(".dfx-ve-content-categories span").removeClass('active');
            }
            $scope.showMenuIcons = function(ev, menuItem) {
                $scope.targetItem = menuItem;

                var dfxCssStyleDialog = '<div class="dfx-ve-dialog"></div>';
                $('body').append(dfxCssStyleDialog);
                $('.dfx-ve-dialog').load('/gcontrols/web/menu_dialog_icons.html', function(response,status,xhr){
                    $compile($('.dfx-ve-dialog').contents())($scope);
                    $('.sp-container').remove();
                    // $timeout(function() {
                    //     $('.dfx-ve-css-style-editor').addClass('active');
                    // $('#' + $scope.component_id + '_md_dialog .second-dialog-box').load('/gcontrols/web/menu_dialog_icons.html');
                    $timeout(function() {
                        // $compile($('.second-dialog-box').contents())($scope);
                        $('#' + $scope.component_id + '_md_dialog .second-dialog').delay(500).fadeIn(500);
                    }, 0);
                });
            }
            $scope.setDfxIcon = function(icon, type) {
                if ( !$attrs.dfxMenuState ) {
                    $scope.targetItem.icon = { "value": "'" + icon + "'", type: type }
                } else {
                    switch ( $attrs.dfxMenuState ) {
                        case 'checked':
                            $scope.targetItem.state.checkedIcon.value = "'" + icon + "'";
                            $scope.targetItem.state.checkedIcon.type = type;
                            break;
                        case 'unchecked':
                            $scope.targetItem.state.uncheckedIcon.value = "'" + icon + "'";
                            $scope.targetItem.state.uncheckedIcon.type = type;
                            break;
                    }
                }
                $timeout(function(){
                    $($scope.targetMenuIcon).focus().blur();
                }, 0);
                $(".second-dialog").fadeOut('250', function() { $(this).remove(); });
            }
            $scope.closeMenuIcon = function() {
                $(".second-dialog").fadeOut('250', function() { $(this).remove(); });
            }
        }
    }
}]);

dfxViewEditorApp.directive('dfxVeMenuExpression', [ '$timeout', '$compile', function($timeout, $compile) {
    return {
        restrict: 'E',
        transclude: true,
        replace: true,
        templateUrl: function(el, attrs) {
            return '/gcontrols/web/picker_menu_expression.html';
        },
        controller: function($scope, $element, $attrs) {
            $scope.showMenuExpression = function(ev) {
                $('#' + $scope.component_id + '_md_dialog .second-dialog-box').load('/gcontrols/web/menu_dialog_expression.html');
                $timeout(function() {
                    $compile($('.second-dialog-box').contents())($scope);
                    $scope.targetMenuExprPicker = ev.target;
                    $scope.targetMenuExpression = $($scope.targetMenuExprPicker).parent().children('input');
                    $scope.targetMenuExpValue = angular.element($scope.targetMenuExpression).data('$ngModelController').$viewValue;
                    $("textarea.expression-textarea").val($scope.targetMenuExpValue);
                    $('#' + $scope.component_id + '_md_dialog .second-dialog').fadeIn(250);
                    $('textarea.expression-textarea').focus();
                    $('#dfx-ve-expression-menu-dialog').keyup(function(e) {
                        if(e.which === 13) {
                            var activeTagName = document.activeElement.tagName;
                            if(activeTagName!=='A' && activeTagName!=='TEXTAREA' && activeTagName!=='BUTTON') $scope.saveMenuExpression();
                        }
                        if(e.which === 27) $scope.closeMenuExpression();
                        e.preventDefault();
                        e.stopPropagation();
                    });
                }, 250);
            }
            $scope.addExpression = function(ev) {
                var cursorPos = document.getElementById($scope.component_id+"_expression_textarea").selectionStart,
                areaValue = $("#"+$scope.component_id+"_expression_textarea").val(),
                expressionLength = $("#"+$scope.component_id+"_expression_textarea").val().length,
                varName = ev.target.textContent;
                $("#"+$scope.component_id+"_expression_textarea").val(areaValue.substring(0, cursorPos) + varName + areaValue.substring(cursorPos));
            }
            $scope.saveMenuExpression = function() {
                var newMenuExpression = $("textarea.expression-textarea").val();
                $scope.targetMenuExpression.val(newMenuExpression);
                angular.element($scope.targetMenuExpression).data('$ngModelController').$setViewValue(newMenuExpression);
                $($scope.targetMenuExpression).focus().blur();
                $(".second-dialog").fadeOut('250', function() { $(this).remove(); });
                $('#dfx-ve-menu-editor-dialog').focus();
            }
            $scope.clearMenuExpression = function() {
                $("textarea.expression-textarea").val('');
            }
            $scope.closeMenuExpression = function() {
                $(".second-dialog").fadeOut('250', function() { $(this).remove(); });
                $('#dfx-ve-menu-editor-dialog').focus();
            }
        }
    }
}]);

dfxViewEditorApp.directive('dfxVeTreeEditor', [ '$mdDialog', '$mdToast', '$http', '$timeout', function($mdDialog, $mdToast, $http, $timeout) {
    return {
        restrict: 'E',
        transclude: true,
        replace: true,
        templateUrl: function( el, attrs ) {
            return '/gcontrols/web/treeview_picker.html';
        },
        link: function(scope, element, attrs) {
            scope.showTreeEditor = function(ev) {
                scope.attributes.static.status = "overridden";
                $mdDialog.show({
                    scope: scope.$new(),
                    parent: angular.element(document.body),
                    targetEvent: ev,
                    clickOutsideToClose:true,
                    escapeToClose: false,
                    ariaLabel: 'tree-view-editor',
                    templateUrl: '/gcontrols/web/treeview_editor.html',
                    onComplete: function() {
                        scope.children = scope.attributes.static.value;
                        scope.tree = scope.children[0];
                        $('#dfx-ve-menu-editor-dialog').keyup(function(e) {
                            if(e.which === 13 && $('#dfx-ve-expression-menu-dialog').length === 0) {
                                if(document.activeElement.tagName!=='BUTTON')  scope.closeDialog();
                            }
                            if(e.which === 27) scope.closeDialog();
                            e.preventDefault();
                            e.stopPropagation();
                        });
                        $timeout(function() {
                            scope.indexTreeItem = 0;
                            scope.arrayElement = scope.children;
                            scope.gcTreeItems = $("md-content.tree-structure").find('li');
                            $("md-content.tree-structure > ul > li:first-child").addClass('active');
                            scope.parentTreeItem = $("md-content.tree-structure").find('li.active');
                        }, 0);
                    },
                    controller: function(){
                        scope.bridge = '.children';
                        if (scope.attributes.treeItemsType.value == 'static') {
                            scope.attributes.static.status = "overridden";
                        }

                        scope.selectTreeItem = function(ev, treeItem) {
                            scope.tree = treeItem;
                            scope.selectedTreeItem = ev.target,
                            scope.selfParents = $(scope.selectedTreeItem).parents('li.tree-view-item'),
                            scope.levelTreeItem = scope.selfParents.length,
                            scope.parentTreeItem = $(scope.selectedTreeItem).parent();
                            scope.indexTreeItem = scope.parentTreeItem.index();
                            scope.indexParentTreeItem = '';
                            scope.gcTreeItems = $("md-content.tree-structure").find('li');
                            scope.arrayElement = '';
                            scope.indentPath = '';
                            scope.outdentPath = '';
                            scope.gcTreeItems.removeClass('active');
                            scope.parentTreeItem.addClass('active');
                            scope.selfParents.each(function(index, element){
                                if (index === 0) {
                                    scope.arrayElement = scope.bridge;
                                    scope.indexParentTreeItem = $(element).attr('parent-index');
                                    var indendIndex = $(element).attr('self-index') - 1;
                                    scope.indentPath = scope.bridge + '[' + indendIndex + ']' + scope.bridge;
                                    if ($(element).attr('self-index') > 0) {
                                        scope.canIndent = true;
                                    } else {
                                        scope.canIndent = false;
                                    }
                                } else if (index === 1) {
                                    scope.indentPath = scope.bridge + '[' + $(element).attr('self-index') + ']' + scope.indentPath;
                                    scope.outdentPath = scope.bridge;
                                    scope.arrayElement = scope.bridge + '[' + $(element).attr('self-index') + ']' + scope.arrayElement;

                                } else {
                                    scope.arrayElement = scope.bridge + '[' + $(element).attr('self-index') + ']' + scope.arrayElement;
                                    scope.indentPath = scope.bridge + '[' + $(element).attr('self-index') + ']' + scope.indentPath;
                                    scope.outdentPath = scope.bridge + '[' + $(element).attr('self-index') + ']' + scope.outdentPath;
                                }
                            })
                            scope.arrayElement = eval('scope' + scope.arrayElement);
                            scope.outdentPath = eval('scope' + scope.outdentPath);
                            scope.checkMenuRootPadding();
                        }
                        scope.toggleTreeItem = function(ev){
                            var entity_trigger = $(ev.target),
                                entity_container = entity_trigger.parent().siblings('ul');

                            entity_trigger.hasClass('collapsed') ? entity_trigger.removeClass('collapsed') : entity_trigger.addClass('collapsed');
                            entity_container.slideToggle();
                        }
                        scope.checkMenuRootPadding = function() {
                            $timeout(function() {
                                var root_togglers = $('.menu-structure > ul > li > span').length;

                                root_togglers>0 ? $('.menu-structure > ul').css('padding-left', '16px') : $('.menu-structure > ul').css('padding-left', '0px');
                            }, 0);
                        }
                        scope.checkMenuRootPadding();

                        scope.addTreeItem = function() {
                            var treeItemTemplate = {
                                "name": "'New item'",
                                "children": []
                            }
                            if ( scope.children.length > 0 ) {
                                angular.forEach(scope.arrayElement, function(obj, index){
                                    if (index === scope.indexTreeItem) {
                                        scope.arrayElement.splice(index+1, 0, treeItemTemplate);
                                        return;
                                    }
                                });
                                $timeout(function() {
                                    scope.indexTreeItem = scope.indexTreeItem + 1;
                                    scope.tree = scope.arrayElement[scope.indexTreeItem];
                                    var currentItem = $("md-content.tree-structure").find('li.active');
                                    $("md-content.tree-structure").find('li').removeClass('active');
                                    currentItem.next().addClass('active');
                                    scope.parentTreeItem = scope.parentTreeItem.next();
                                }, 0);
                            } else {
                                scope.children.push(treeItemTemplate);
                                $timeout(function() {
                                    scope.arrayElement = scope.children;
                                    scope.indexTreeItem = 0;
                                    scope.parentTreeItem = $("md-content.tree-structure li.tree-view-item");
                                    $(scope.parentTreeItem).addClass('active');
                                    scope.tree = scope.children[0];
                                }, 0);
                            }
                            scope.checkMenuRootPadding();
                        }
                        scope.deleteTreeItem = function() {
                            if ( scope.children.length > 0 ) {
                                if ( scope.arrayElement.length > 1 ) {
                                    $timeout(function() {
                                        if ( scope.arrayElement.length === scope.indexTreeItem + 1 ) {
                                            scope.parentTreeItem = $("md-content.tree-structure").find('li.active').prev();
                                            scope.arrayElement.splice(scope.indexTreeItem, 1);
                                            scope.indexTreeItem = scope.indexTreeItem - 1;
                                            scope.tree = scope.arrayElement[scope.indexTreeItem];
                                            $("md-content.tree-structure").find('li').removeClass('active');
                                            scope.parentTreeItem.addClass('active');
                                        } else {
                                            scope.arrayElement.splice(scope.indexTreeItem, 1);
                                            scope.tree = scope.arrayElement[scope.indexTreeItem];
                                        }
                                    }, 0);
                                } else {
                                    scope.arrayElement.splice(scope.indexTreeItem, 1);
                                    scope.parents = $(scope.parentTreeItem).parents('li.tree-view-item');
                                    scope.treeLevel = scope.parents.length;
                                    scope.parentTreeItem = scope.parents.first();
                                    scope.indexTreeItem = scope.parentTreeItem.index();
                                    scope.parentTreeItem.addClass('active');
                                    scope.arrayElement = '';
                                    scope.parents.each(function(index, element){
                                        if ( index === 0 ) {
                                            scope.arrayElement = scope.bridge;
                                        } else {
                                            scope.arrayElement = scope.bridge + '[' + $(element).attr('self-index') + ']' + scope.arrayElement;
                                        }
                                    });
                                    scope.arrayElement = eval('scope' + scope.arrayElement);
                                    scope.tree = scope.arrayElement[scope.indexTreeItem];
                                }
                            }
                            scope.checkMenuRootPadding();
                        }
                        Array.prototype.move = function(from,to){
                            scope.gcTreeItems.removeClass('active');
                            this.splice(to,0,this.splice(from,1)[0]);
                            return this;
                        }
                        scope.moveUpTreeItem = function() {
                            if ( scope.indexTreeItem > 0 ) {
                                $timeout(function() {
                                    scope.arrayElement.move(scope.indexTreeItem - 1,scope.indexTreeItem).join(',');
                                    scope.indexTreeItem = scope.indexTreeItem - 1;
                                    $("md-content.tree-structure").find('li').removeClass('active');
                                    scope.parentTreeItem = scope.parentTreeItem.prev();
                                    scope.parentTreeItem.addClass('active');
                                }, 0);
                            }
                            scope.checkMenuRootPadding();
                        }
                        scope.moveDownTreeItem = function() {
                            if ( scope.indexTreeItem !== scope.arrayElement.length-1 && angular.isNumber(scope.indexTreeItem) === true ) {
                                scope.arrayElement.move(scope.indexTreeItem,scope.indexTreeItem + 1).join(',');
                                scope.indexTreeItem = scope.indexTreeItem + 1;
                                $("md-content.tree-structure").find('li').removeClass('active');
                                scope.parentTreeItem = scope.parentTreeItem.next();
                                scope.parentTreeItem.addClass('active');
                            }
                            scope.checkMenuRootPadding();
                        }
                        scope.indentTreeItem = function() {
                            if ( scope.parentTreeItem.index() > 0 ) {
                                scope.arrayElement[scope.parentTreeItem.index()-1].children.push(scope.arrayElement[scope.parentTreeItem.index()]);
                                var toSplice = scope.parentTreeItem.index();
                                scope.parentTreeItem = $(scope.parentTreeItem).prev();
                                scope.arrayElement.splice(toSplice, 1);
                                scope.arrayElement = scope.arrayElement[toSplice-1].children;
                                $timeout(function() {
                                    $("md-content.tree-structure").find('li').removeClass('active');
                                    scope.indexTreeItem = scope.arrayElement.length - 1;
                                    $(scope.parentTreeItem).children('ul').find('li').last().addClass('active');
                                    scope.parentTreeItem = $("md-content.tree-structure").find('li.active');
                                }, 0);
                            }
                            scope.checkMenuRootPadding();
                        }
                        scope.outdentTreeItem = function() {
                            scope.parents = $(scope.parentTreeItem).parents('li.tree-view-item');
                            if ( scope.parents.length > 0 ) {
                                scope.outdentElement = scope.arrayElement[scope.indexTreeItem];
                                scope.arrayElement.splice(scope.indexTreeItem, 1);
                                scope.arrayElement = '';
                                scope.parents.each(function(index, element){
                                    if ( index === 0 ) {
                                        scope.arrayElement = scope.bridge;
                                        scope.parentTreeItem = $(element);
                                        scope.indexTreeItem = $(scope.parentTreeItem).index() + 1;
                                    } else {
                                        scope.arrayElement = scope.bridge + '[' + $(element).attr('self-index') + ']' + scope.arrayElement;
                                    }
                                });
                                $("md-content.tree-structure").find('li').removeClass('active');
                                scope.arrayElement = eval('scope' + scope.arrayElement);
                                scope.arrayElement.splice(scope.indexTreeItem, 0, scope.outdentElement);
                                $timeout(function() {
                                    scope.parentTreeItem = $(scope.parentTreeItem).next();
                                    $(scope.parentTreeItem).addClass('active');
                                }, 0);
                            }
                            scope.checkMenuRootPadding();
                        }
                        scope.closeDialog = function() {
                            $mdDialog.hide();
                        }
                    }
                });
            }
        }
    }
}]);

dfxViewEditorApp.directive('dfxGcToolbarDesign', function($sce, $compile, $timeout, $mdMenu, $filter) {
    return {
        restrict: 'E',
        transclude: true,
        replace: true,
        templateUrl: function( el, attrs) {
            return '/gcontrols/web/toolbar_design.html';
        },
        link: function(scope, element, attrs) {
            var singleMenuItem ='', toolbarType='', iconbarMenuItem = '<md-menu-item ng-if="{{itemDisplay}}">';

            var buildNextLevel = function ( nextLevel, road ) {
                for ( var i = 0; i < nextLevel.length; i++ ) {
                    if ( nextLevel[i].menuItems.value.length > 0 ) {
                        var iconbarItem = iconbarMenuItem.replace('{{itemDisplay}}', true);
                        scope.iconBar = scope.iconBar + iconbarItem + '<md-menu>';
                        createDfxMenuItem( nextLevel[i], 'singleMenuItem', road, i );
                        buildNextLevel( nextLevel[i].menuItems.value, road + ',' + i );
                        scope.iconBar = scope.iconBar + '</md-menu-content></md-menu></md-menu-item>';
                    } else {
                        if ( nextLevel[i].divider === true ) {
                            scope.iconBar = scope.iconBar + '<md-menu-divider></md-menu-divider>';
                        } else if ( nextLevel[i].title === true ) {
                            scope.iconBar = scope.iconBar + '<md-menu-item class="tree-menu-title"><div>'+'{{'+nextLevel[i].label+' | checkExpression}}'+'</div></md-menu-item>';
                        } else {
                            var iconbarItem = iconbarMenuItem.replace('{{itemDisplay}}', true);
                            scope.iconBar = scope.iconBar + iconbarItem;
                            createDfxMenuItem( nextLevel[i], 'singleMenuItem', road, i );
                        }
                    }
                }
            }

            var createDfxMenuItem = function( dfxMenuItem, type, level, index ) {
                if ( typeof dfxMenuItem.icon === 'string' ) {
                    var tempIcon = dfxMenuItem.icon;
                    dfxMenuItem.icon = {
                        "value": tempIcon,
                        "type":  dfxMenuItem.hasOwnProperty('iconType') ? dfxMenuItem.iconType : 'fa-icon'
                    }
                }
                var tempPropObject = {};
                tempPropObject.faIcon =                 dfxMenuItem.icon.value.indexOf("'") == -1 ? 'fa-home' : eval(dfxMenuItem.icon.value);
                tempPropObject.svgIcon =                dfxMenuItem.icon.value.indexOf("'") == -1 ? 'home' : eval(dfxMenuItem.icon.value);
                tempPropObject.faItemIndex =            level >= 0 ? level + ',' + index : index;
                tempPropObject.svgItemIndex =           level >= 0 ? level + ',' + index : index;
                tempPropObject.itemDisabled =           dfxMenuItem.disabled;
                tempPropObject.itemDisplay =            true;
                tempPropObject.itemLabel =              $filter('checkExpression')(dfxMenuItem.label);
                tempPropObject.itemClick =              dfxMenuItem.menuItems.value.length > 0 ? '$mdOpenMenu();'+dfxMenuItem.onclick : 'unfocusButton($event);'+dfxMenuItem.onclick;
                if ( type === 'singleMenuItem' ) {
                    tempPropObject.itemShortcut =       dfxMenuItem.shortcut;
                    tempPropObject.ifItemNotification = dfxMenuItem.notification.length > 0 ? true : false;
                    tempPropObject.itemNotification =   dfxMenuItem.notification;
                }
                if ( toolbarType==='iconBar' ) {
                    if ( dfxMenuItem.hasOwnProperty('waiting')) { delete dfxMenuItem.waiting; }
                    if ( !dfxMenuItem.hasOwnProperty('state') ) {
                        dfxMenuItem.state = {
                            "value":           false,
                            "binding":         "true",
                            "checkedIcon":   { "value": "'thumb_up'", "type": "svg-icon", "style": "", "class": "" },
                            "uncheckedIcon": { "value": "'thumb_down'", "type": "svg-icon", "style": "", "class": "" }
                        };
                    }
                    tempPropObject.ifFaIcon =               dfxMenuItem.icon.value.length > 0 && dfxMenuItem.icon.type === 'fa-icon' && !dfxMenuItem.state.value ? true : false;
                    tempPropObject.ifSvgIcon =              dfxMenuItem.icon.value.length > 0 && dfxMenuItem.icon.type === 'svg-icon' && !dfxMenuItem.state.value ? true : false;
                    tempPropObject.ifStateFaIcon =          dfxMenuItem.state.checkedIcon.value.length > 0 && dfxMenuItem.state.checkedIcon.type === 'fa-icon' && dfxMenuItem.state.value ? true : false;
                    tempPropObject.ifStateSvgIcon =         dfxMenuItem.state.checkedIcon.value.length > 0 && dfxMenuItem.state.checkedIcon.type === 'svg-icon' && dfxMenuItem.state.value ? true : false;
                    tempPropObject.stateFaIcon =            dfxMenuItem.state.checkedIcon.value.indexOf("'") == -1 ? 'fa-thumbs-up' : eval(dfxMenuItem.state.checkedIcon.value);
                    tempPropObject.stateSvgIcon =           dfxMenuItem.state.checkedIcon.value.indexOf("'") == -1 ? 'thumb_up' : eval(dfxMenuItem.state.checkedIcon.value);
                    tempPropObject.stateFaIconStyle =       dfxMenuItem.state.checkedIcon.style;
                    tempPropObject.stateSvgIconStyle =      dfxMenuItem.state.checkedIcon.style;
                    tempPropObject.stateFaIconClass =       dfxMenuItem.state.checkedIcon.class;
                    tempPropObject.stateSvgIconClass =      dfxMenuItem.state.checkedIcon.class;
                } else if (  toolbarType==='buttons' ) {
                    scope.waitableItem = { "value": false };
                    if ( dfxMenuItem.hasOwnProperty('state')) { delete dfxMenuItem.state; }
                    if ( typeof level === 'undefined' ) {
                        scope.waitableItem.value = true;
                        if ( !dfxMenuItem.hasOwnProperty('waiting') ) {
                            dfxMenuItem.waiting = {
                                "value": "", "autoDisabled": false,
                                "icon": { "value": "'fa-spinner'", "type": "fa-icon", "style": "", "class": "fa-pulse" }
                            }
                        }
                    } else {
                        scope.waitableItem.value = false;
                        if ( dfxMenuItem.hasOwnProperty('waiting')) { delete dfxMenuItem.waiting; }
                    }
                    if ( type === 'singleMenuItem' ) {
                        tempPropObject.ifFaIcon =              dfxMenuItem.icon.value.length > 0 && dfxMenuItem.icon.type === 'fa-icon' ? true : false;
                        tempPropObject.ifSvgIcon =             dfxMenuItem.icon.value.length > 0 && dfxMenuItem.icon.type === 'svg-icon' ? true : false;
                    } else {
                        tempPropObject.ifFaIcon =              dfxMenuItem.icon.value.length > 0 && dfxMenuItem.icon.type === 'fa-icon' && dfxMenuItem.waiting.value !=='true' ? true : false;
                        tempPropObject.ifSvgIcon =             dfxMenuItem.icon.value.length > 0 && dfxMenuItem.icon.type === 'svg-icon' && dfxMenuItem.waiting.value !=='true' ? true : false;
                        tempPropObject.ifWaitFaIcon =          dfxMenuItem.icon.value.length > 0 && dfxMenuItem.icon.type === 'fa-icon' && dfxMenuItem.waiting.value ==='true' ? true : false;
                        tempPropObject.ifWaitSvgIcon =         dfxMenuItem.icon.value.length > 0 && dfxMenuItem.icon.type === 'svg-icon' && dfxMenuItem.waiting.value ==='true' ? true : false;
                        tempPropObject.waitFaIcon =            dfxMenuItem.waiting.icon.value.indexOf("'") == -1 ? 'fa-spinner' : eval(dfxMenuItem.waiting.icon.value);
                        tempPropObject.waitSvgIcon =           dfxMenuItem.waiting.icon.value.indexOf("'") == -1 ? 'track_changes' : eval(dfxMenuItem.waiting.icon.value);
                        tempPropObject.waitFaIconStyle =       dfxMenuItem.waiting.icon.style;
                        tempPropObject.waitSvgIconStyle =      dfxMenuItem.waiting.icon.style;
                        tempPropObject.waitFaIconClass =       dfxMenuItem.waiting.icon.class;
                        tempPropObject.waitSvgIconClass =      dfxMenuItem.waiting.icon.class;
                    }
                }
                var tempMenu = '';
                if ( type === 'singleMenuItem' ) {
                    tempMenu = singleMenuItem
                        .replace('{{ifFaIcon}}',           tempPropObject.ifFaIcon )
                        .replace('{{ifSvgIcon}}',          tempPropObject.ifSvgIcon )
                        .replace('{{ifStateFaIcon}}',      tempPropObject.ifStateFaIcon )
                        .replace('{{ifStateSvgIcon}}',     tempPropObject.ifStateSvgIcon )
                        .replace('{{faIcon}}',             tempPropObject.faIcon )
                        .replace('{{svgIcon}}',            tempPropObject.svgIcon )
                        .replace('{{stateFaIcon}}',        tempPropObject.stateFaIcon )
                        .replace('{{stateSvgIcon}}',       tempPropObject.stateSvgIcon )
                        .replace('{{stateFaIconStyle}}',   tempPropObject.stateFaIconStyle )
                        .replace('{{stateSvgIconStyle}}',  tempPropObject.stateSvgIconStyle )
                        .replace('{{stateFaIconClass}}',   tempPropObject.stateFaIconClass )
                        .replace('{{stateSvgIconClass}}',  tempPropObject.stateSvgIconClass )
                        .replace('{{itemLabel}}',          tempPropObject.itemLabel )
                        .replace('{{itemShortcut}}',       tempPropObject.itemShortcut )
                        .replace('{{ifItemNotification}}', tempPropObject.ifItemNotification )
                        .replace('{{itemNotification}}',   tempPropObject.itemNotification )
                        .replace('{{itemIndex}}',          tempPropObject.itemIndex )
                        .replace('{{itemDisplay}}',        tempPropObject.itemDisplay )
                        .replace('{{itemDisabled}}',       tempPropObject.itemDisabled )
                        .replace('{{itemClick}}',          tempPropObject.itemClick );
                } else {
                    tempMenu = scope.rootMenuItem
                        .replace('{{ifFaIcon}}',           tempPropObject.ifFaIcon )
                        .replace('{{ifSvgIcon}}',          tempPropObject.ifSvgIcon )
                        .replace('{{ifStateFaIcon}}',      tempPropObject.ifStateFaIcon )
                        .replace('{{ifStateSvgIcon}}',     tempPropObject.ifStateSvgIcon )
                        .replace('{{ifWaitFaIcon}}',       tempPropObject.ifWaitFaIcon )
                        .replace('{{ifWaitSvgIcon}}',      tempPropObject.ifWaitSvgIcon )
                        .replace('{{faIcon}}',             tempPropObject.faIcon )
                        .replace('{{svgIcon}}',            tempPropObject.svgIcon )
                        .replace('{{stateFaIcon}}',        tempPropObject.stateFaIcon )
                        .replace('{{stateSvgIcon}}',       tempPropObject.stateSvgIcon )
                        .replace('{{stateFaIconStyle}}',   tempPropObject.stateFaIconStyle )
                        .replace('{{stateSvgIconStyle}}',  tempPropObject.stateSvgIconStyle )
                        .replace('{{stateFaIconClass}}',   tempPropObject.stateFaIconClass )
                        .replace('{{stateSvgIconClass}}',  tempPropObject.stateSvgIconClass )
                        .replace('{{waitFaIcon}}',         tempPropObject.waitFaIcon )
                        .replace('{{waitSvgIcon}}',        tempPropObject.waitSvgIcon )
                        .replace('{{waitFaIconStyle}}',    tempPropObject.waitFaIconStyle )
                        .replace('{{waitSvgIconStyle}}',   tempPropObject.waitSvgIconStyle )
                        .replace('{{waitFaIconClass}}',    tempPropObject.waitFaIconClass )
                        .replace('{{waitSvgIconClass}}',   tempPropObject.waitSvgIconClass )
                        .replace('{{itemLabel}}',          tempPropObject.itemLabel )
                        .replace('{{itemIndex}}',          tempPropObject.itemIndex )
                        .replace('{{itemDisplay}}',        tempPropObject.itemDisplay )
                        .replace('{{itemDisabled}}',       tempPropObject.itemDisabled )
                        .replace('{{itemClick}}',          tempPropObject.itemClick );
                }
                if ( dfxMenuItem.menuItems.value.length > 0 ) {
                    scope.iconBar = scope.iconBar + tempMenu +'<md-menu-content width="4">';
                } else {
                    if ( type === 'singleMenuItem' ) {
                        scope.iconBar = scope.iconBar + tempMenu + '</md-menu-item>';
                    } else {
                        scope.iconBar = scope.iconBar + tempMenu + '<md-menu-content width="4"></md-menu-content>';
                    }
                }
            }

            scope.unfocusButton = function( event ){
                var target = $(event.target);
                if ( target.is( "button" ) ) {
                    target.blur();
                } else {
                    $(target.parent()[0]).blur();
                }
            }

            scope.iconbarBuilder = function( side ) {
                $timeout(function() {
                    if ( side === 'left' ) {
                        if ( scope.attributes.toolbar.leftMenu.type.value === 'Icon Bar' ) {
                            toolbarType='iconBar';
                            scope.leftRootMenuItem = '<button ng-click="{{itemClick}}" ng-show="{{itemDisplay}}" menu-index="{{itemIndex}}" ng-disabled="{{itemDisabled}}" style="{{attributes.toolbar.leftMenu.iconBar.triggerButton.style}}" aria-label="md-icon-button" class="md-icon-button {{attributes.toolbar.leftMenu.iconBar.triggerButton.class}}">'+
                            '<md-icon ng-if="{{ifFaIcon}}" class="fa {{faIcon}} dfx-core-gc-toolbar-left-menu-iconbar {{attributes.toolbar.leftMenu.iconBar.triggerButton.icon.class}}" style="font-size:{{attributes.toolbar.leftMenu.iconBar.triggerButton.icon.size}}px; {{attributes.toolbar.leftMenu.iconBar.triggerButton.icon.style}}"></md-icon>'+
                            '<ng-md-icon ng-if="{{ifSvgIcon}}" icon="{{svgIcon}}" size="{{attributes.toolbar.leftMenu.iconBar.triggerButton.icon.size}}" class="dfx-core-gc-toolbar-left-menu-iconbar {{attributes.toolbar.leftMenu.iconBar.triggerButton.icon.class}}" style="{{attributes.toolbar.leftMenu.iconBar.triggerButton.icon.style}}"></ng-md-icon>'+
                            '<md-icon ng-if="{{ifStateFaIcon}}" class="fa {{stateFaIcon}} dfx-core-gc-toolbar-left-menu-iconbar {{attributes.toolbar.leftMenu.iconBar.triggerButton.icon.class}} {{stateFaIconClass}}" style="font-size:{{attributes.toolbar.leftMenu.iconBar.triggerButton.icon.size}}px; {{attributes.toolbar.leftMenu.iconBar.triggerButton.icon.style}} {{stateFaIconStyle}}"></md-icon>'+
                            '<ng-md-icon ng-if="{{ifStateSvgIcon}}" icon="{{stateSvgIcon}}" size="{{attributes.toolbar.leftMenu.iconBar.triggerButton.icon.size}}" class="dfx-core-gc-toolbar-left-menu-iconbar {{attributes.toolbar.leftMenu.iconBar.triggerButton.icon.class}} {{stateSvgIconClass}}" style="{{attributes.toolbar.leftMenu.iconBar.triggerButton.icon.style}} {{stateSvgIconStyle}}"></ng-md-icon>'+
                            '</button>';
                            singleMenuItem ='<md-button ng-show="{{itemDisplay}}" ng-disabled="{{itemDisabled}}" menu-index="{{itemIndex}}" ng-click="{{itemClick}}" '+
                            'class="dfx-menu-button {{attributes.toolbar.leftMenu.iconBar.actionButton.class}}" style="{{attributes.toolbar.leftMenu.iconBar.actionButton.style}}" aria-label="iconbar-button" >'+
                            '<md-icon ng-if="{{ifFaIcon}}" class="fa {{faIcon}} dfx-menu-button-icon {{attributes.toolbar.leftMenu.iconBar.actionButton.icon.class}}" style="font-size:{{attributes.toolbar.leftMenu.iconBar.actionButton.icon.size}}px; {{attributes.toolbar.leftMenu.iconBar.actionButton.icon.style}}"></md-icon>'+
                            '<ng-md-icon ng-if="{{ifSvgIcon}}" icon="{{svgIcon}}" size="{{attributes.toolbar.leftMenu.iconBar.actionButton.icon.size}}" class="dfx-menu-button-icon {{attributes.toolbar.leftMenu.iconBar.actionButton.icon.class}}" style="{{attributes.toolbar.leftMenu.iconBar.actionButton.icon.style}}"></ng-md-icon>'+
                            '<i><md-icon ng-if="{{ifStateFaIcon}}" class="fa {{stateFaIcon}} dfx-menu-button-icon {{attributes.toolbar.leftMenu.iconBar.actionButton.icon.class}} {{stateFaIconClass}}" style="font-size:{{attributes.toolbar.leftMenu.iconBar.actionButton.icon.size}}px; {{attributes.toolbar.leftMenu.iconBar.actionButton.icon.style}} {{stateFaIconStyle}}"></md-icon>'+
                            '<ng-md-icon ng-if="{{ifStateSvgIcon}}" icon="{{stateSvgIcon}}" size="{{attributes.toolbar.leftMenu.iconBar.actionButton.icon.size}}" class="dfx-menu-button-icon {{attributes.toolbar.leftMenu.iconBar.actionButton.icon.class}} {{stateFaIconClass}}" style="{{attributes.toolbar.leftMenu.iconBar.actionButton.icon.style}} {{stateSvgIconStyle}}"></ng-md-icon></i>'+
                            '<span>{{itemLabel}}</span>'+
                            '<span class="md-alt-text">{{itemShortcut}}</span>'+
                            '<small ng-if="{{ifItemNotification}}">{{itemNotification}}</small>'+
                            '</md-button>';

                        } else if ( scope.attributes.toolbar.leftMenu.type.value === 'Buttons' ) {
                            toolbarType='buttons';
                            scope.leftRootMenuItem = '<button aria-label="left_buttons" ng-click="{{itemClick}}" style="width: 100%; {{attributes.toolbar.leftMenu.buttons.triggerButton.style}}"' +
                            'class="dfx-core-gc-toolbar-left-buttons md-button md-raised md-altTheme-theme glyph {{attributes.toolbar.leftMenu.buttons.triggerButton.class}}">'+
                            '<div ng-if="{{ifFaIcon}}">'+
                                '<md-icon class="fa {{faIcon}} dfx-core-gc-toolbar-left-menu-icon {{attributes.toolbar.leftMenu.buttons.triggerButton.icon.class}}" style="font-size: {{attributes.toolbar.leftMenu.buttons.triggerButton.icon.size}}px; width: {{attributes.toolbar.leftMenu.buttons.triggerButton.icon.size}}px; height: {{attributes.toolbar.leftMenu.buttons.triggerButton.icon.size}}px; {{attributes.toolbar.leftMenu.buttons.triggerButton.icon.style}}"></md-icon>'+
                            '</div>'+
                            '<div ng-if="{{ifSvgIcon}}">'+
                                '<ng-md-icon icon="{{svgIcon}}" size="{{attributes.toolbar.leftMenu.buttons.triggerButton.icon.size}}" class="dfx-core-gc-toolbar-left-menu-icon {{attributes.toolbar.leftMenu.buttons.triggerButton.icon.class}}" style="width: {{attributes.toolbar.leftMenu.buttons.triggerButton.icon.size}}px; height: {{attributes.toolbar.leftMenu.buttons.triggerButton.icon.size}}px;{{attributes.toolbar.leftMenu.buttons.triggerButton.icon.style}}"></ng-md-icon>'+
                            '</div>'+
                            '<div ng-if="{{ifWaitFaIcon}}">'+
                                '<md-icon class="fa {{waitFaIcon}} dfx-core-gc-toolbar-left-menu-icon {{attributes.toolbar.leftMenu.buttons.triggerButton.icon.class}} {{waitFaIconClass}}" style="font-size: {{attributes.toolbar.leftMenu.buttons.triggerButton.icon.size}}px; width: {{attributes.toolbar.leftMenu.buttons.triggerButton.icon.size}}px; height: {{attributes.toolbar.leftMenu.buttons.triggerButton.icon.size}}px;{{attributes.toolbar.leftMenu.buttons.triggerButton.icon.style}}; {{waitFaIconStyle}}"></md-icon>'+
                            '</div>'+
                            '<div ng-if="{{ifWaitSvgIcon}}">'+
                                '<ng-md-icon icon="{{waitSvgIcon}}" size="{{attributes.toolbar.leftMenu.buttons.triggerButton.icon.size}}" class="dfx-core-gc-toolbar-left-menu-icon {{attributes.toolbar.leftMenu.buttons.triggerButton.icon.class}} {{waitSvgIconClass}}" style="width: {{attributes.toolbar.leftMenu.buttons.triggerButton.icon.size}}px; height: {{attributes.toolbar.leftMenu.buttons.triggerButton.icon.size}}px;{{attributes.toolbar.leftMenu.buttons.triggerButton.icon.style}}; {{waitSvgIconStyle}}"></ng-md-icon>'+
                            '</div>'+
                            '<span style="line-height: 20px;">{{itemLabel}}</span>'+
                            '</button>';
                            singleMenuItem ='<md-button ng-show="{{itemDisplay}}" ng-disabled="{{itemDisabled}}" menu-index="{{itemIndex}}" ng-click="{{itemClick}}" '+
                            'class="dfx-menu-button {{attributes.toolbar.leftMenu.buttons.actionButton.class}}" style="{{attributes.toolbar.leftMenu.buttons.actionButton.style}}" aria-label="buttons-button" >'+
                            '<md-icon ng-if="{{ifFaIcon}}" class="fa {{faIcon}} dfx-menu-button-icon {{attributes.toolbar.leftMenu.buttons.actionButton.icon.class}}" style="font-size:{{attributes.toolbar.leftMenu.buttons.actionButton.icon.size}}px; {{attributes.toolbar.leftMenu.buttons.actionButton.icon.style}}"></md-icon>'+
                            '<ng-md-icon ng-if="{{ifSvgIcon}}" icon="{{svgIcon}}" size="{{attributes.toolbar.leftMenu.buttons.actionButton.icon.size}}" class="dfx-menu-button-icon {{attributes.toolbar.leftMenu.buttons.actionButton.icon.class}}" style="{{attributes.toolbar.leftMenu.buttons.actionButton.icon.style}}"></ng-md-icon>'+
                            '<span>{{itemLabel}}</span>'+
                            '<span class="md-alt-text">{{itemShortcut}}</span>'+
                            '<small ng-if="{{ifItemNotification}}">{{itemNotification}}</small>'+
                            '</md-button>';
                        }
                        scope.iconbarArray = scope.attributes.toolbar.leftMenu.menuItems.value;
                        scope.rootMenuItem = scope.leftRootMenuItem;
                        if ( scope.attributes.toolbar.leftMenu.type.value === 'Buttons' ) {
                            scope.iconBar = '<md-menu-bar class="dfx_toolbar_menubar">';
                        } else {
                            scope.iconBar = '<md-menu-bar>';
                        }
                    } else if ( side === 'right' ) {
                        if ( scope.attributes.toolbar.rightMenu.type.value === 'Icon Bar' ) {
                            toolbarType='iconBar';
                            scope.rightRootMenuItem = '<button ng-click="{{itemClick}}" ng-show="{{itemDisplay}}" menu-index="{{itemIndex}}" ng-disabled="{{itemDisabled}}" style="{{attributes.toolbar.rightMenu.iconBar.triggerButton.style}}" aria-label="md-icon-button" class="md-icon-button {{attributes.toolbar.rightMenu.iconBar.triggerButton.class}}">'+
                            '<md-icon ng-if="{{ifFaIcon}}" class="fa {{faIcon}} dfx-core-gc-toolbar-right-menu-iconbar {{attributes.toolbar.rightMenu.iconBar.triggerButton.icon.class}}" style="font-size:{{attributes.toolbar.rightMenu.iconBar.triggerButton.icon.size}}px; {{attributes.toolbar.rightMenu.iconBar.triggerButton.icon.style}}"></md-icon>'+
                            '<ng-md-icon ng-if="{{ifSvgIcon}}" icon="{{svgIcon}}" size="{{attributes.toolbar.rightMenu.iconBar.triggerButton.icon.size}}" class="dfx-core-gc-toolbar-right-menu-iconbar {{attributes.toolbar.rightMenu.iconBar.triggerButton.icon.class}}" style="{{attributes.toolbar.rightMenu.iconBar.triggerButton.icon.style}}"></ng-md-icon>'+
                            '<md-icon ng-if="{{ifStateFaIcon}}" class="fa {{stateFaIcon}} dfx-core-gc-toolbar-right-menu-iconbar {{attributes.toolbar.rightMenu.iconBar.triggerButton.icon.class}} {{stateFaIconClass}}" style="font-size:{{attributes.toolbar.rightMenu.iconBar.triggerButton.icon.size}}px; {{attributes.toolbar.rightMenu.iconBar.triggerButton.icon.style}} {{stateFaIconStyle}}"></md-icon>'+
                            '<ng-md-icon ng-if="{{ifStateSvgIcon}}" icon="{{stateSvgIcon}}" size="{{attributes.toolbar.rightMenu.iconBar.triggerButton.icon.size}}" class="dfx-core-gc-toolbar-right-menu-iconbar {{attributes.toolbar.rightMenu.iconBar.triggerButton.icon.class}} {{stateSvgIconClass}}" style="{{attributes.toolbar.rightMenu.iconBar.triggerButton.icon.style}} {{stateSvgIconStyle}}"></ng-md-icon>'+
                            '</button>';
                            singleMenuItem ='<md-button ng-show="{{itemDisplay}}" ng-disabled="{{itemDisabled}}" menu-index="{{itemIndex}}" ng-click="{{itemClick}}" '+
                            'class="dfx-menu-button {{attributes.toolbar.rightMenu.iconBar.actionButton.class}}" style="{{attributes.toolbar.rightMenu.iconBar.actionButton.style}}" aria-label="iconbar-button" >'+
                            '<md-icon ng-if="{{ifFaIcon}}" class="fa {{faIcon}} dfx-menu-button-icon {{attributes.toolbar.rightMenu.iconBar.actionButton.icon.class}}" style="font-size:{{attributes.toolbar.rightMenu.iconBar.actionButton.icon.size}}px; {{attributes.toolbar.rightMenu.iconBar.actionButton.icon.style}}"></md-icon>'+
                            '<ng-md-icon ng-if="{{ifSvgIcon}}" icon="{{svgIcon}}" size="{{attributes.toolbar.rightMenu.iconBar.actionButton.icon.size}}" class="dfx-menu-button-icon {{attributes.toolbar.rightMenu.iconBar.actionButton.icon.class}}" style="{{attributes.toolbar.rightMenu.iconBar.actionButton.icon.style}}"></ng-md-icon>'+
                            '<i><md-icon ng-if="{{ifStateFaIcon}}" class="fa {{stateFaIcon}} dfx-menu-button-icon {{attributes.toolbar.rightMenu.iconBar.actionButton.icon.class}} {{stateFaIconClass}}" style="font-size:{{attributes.toolbar.rightMenu.iconBar.actionButton.icon.size}}px; {{attributes.toolbar.rightMenu.iconBar.actionButton.icon.style}} {{stateFaIconStyle}}"></md-icon>'+
                            '<ng-md-icon ng-if="{{ifStateSvgIcon}}" icon="{{stateSvgIcon}}" size="{{attributes.toolbar.rightMenu.iconBar.actionButton.icon.size}}" class="dfx-menu-button-icon {{attributes.toolbar.rightMenu.iconBar.actionButton.icon.class}} {{stateFaIconClass}}" style="{{attributes.toolbar.rightMenu.iconBar.actionButton.icon.style}} {{stateSvgIconStyle}}"></ng-md-icon></i>'+
                            '<span>{{itemLabel}}</span>'+
                            '<span class="md-alt-text">{{itemShortcut}}</span>'+
                            '<small ng-if="{{ifItemNotification}}">{{itemNotification}}</small>'+
                            '</md-button>';
                        } else if ( scope.attributes.toolbar.rightMenu.type.value === 'Buttons' ) {
                            toolbarType='buttons';
                            scope.rightRootMenuItem = '<button aria-label="right_buttons" ng-click="{{itemClick}}" style="width: 100%; {{attributes.toolbar.rightMenu.buttons.triggerButton.style}}" ' +
                            'class="dfx-core-gc-toolbar-right-buttons md-button md-raised md-altTheme-theme glyph {{attributes.toolbar.rightMenu.buttons.triggerButton.class}}">'+
                            '<div ng-if="{{ifFaIcon}}">'+
                                '<md-icon class="fa {{faIcon}} dfx-core-gc-toolbar-right-menu-icon {{attributes.toolbar.rightMenu.buttons.triggerButton.icon.class}}" style="font-size: {{attributes.toolbar.rightMenu.buttons.triggerButton.icon.size}}px; width: {{attributes.toolbar.rightMenu.buttons.triggerButton.icon.size}}px; height: {{attributes.toolbar.rightMenu.buttons.triggerButton.icon.size}}px; {{attributes.toolbar.rightMenu.buttons.triggerButton.icon.style}}"></md-icon>'+
                            '</div>'+
                            '<div ng-if="{{ifSvgIcon}}">'+
                                '<ng-md-icon icon="{{svgIcon}}" size="{{attributes.toolbar.rightMenu.buttons.triggerButton.icon.size}}" class="dfx-core-gc-toolbar-right-menu-icon {{attributes.toolbar.rightMenu.buttons.triggerButton.icon.class}}" style="width: {{attributes.toolbar.rightMenu.buttons.triggerButton.icon.size}}px; height: {{attributes.toolbar.rightMenu.buttons.triggerButton.icon.size}}px;{{attributes.toolbar.rightMenu.buttons.triggerButton.icon.style}}"></ng-md-icon>'+
                            '</div>'+
                            '<div ng-if="{{ifWaitFaIcon}}">'+
                                '<md-icon class="fa {{waitFaIcon}} dfx-core-gc-toolbar-right-menu-icon {{attributes.toolbar.rightMenu.buttons.triggerButton.icon.class}} {{waitFaIconClass}}" style="font-size: {{attributes.toolbar.rightMenu.buttons.triggerButton.icon.size}}px; width: {{attributes.toolbar.rightMenu.buttons.triggerButton.icon.size}}px; height: {{attributes.toolbar.rightMenu.buttons.triggerButton.icon.size}}px;{{attributes.toolbar.rightMenu.buttons.triggerButton.icon.style}}; {{waitFaIconStyle}}"></md-icon>'+
                            '</div>'+
                            '<div ng-if="{{ifWaitSvgIcon}}">'+
                                '<ng-md-icon icon="{{waitSvgIcon}}" size="{{attributes.toolbar.rightMenu.buttons.triggerButton.icon.size}}" class="dfx-core-gc-toolbar-right-menu-icon {{attributes.toolbar.rightMenu.buttons.triggerButton.icon.class}} {{waitSvgIconClass}}" style="width: {{attributes.toolbar.rightMenu.buttons.triggerButton.icon.size}}px; height: {{attributes.toolbar.rightMenu.buttons.triggerButton.icon.size}}px;{{attributes.toolbar.rightMenu.buttons.triggerButton.icon.style}}; {{waitSvgIconStyle}}"></ng-md-icon>'+
                            '</div>'+
                            '<span style="line-height: 20px;">{{itemLabel}}</span></button>';
                            singleMenuItem ='<md-button ng-show="{{itemDisplay}}" ng-disabled="{{itemDisabled}}" menu-index="{{itemIndex}}" ng-click="{{itemClick}}" '+
                            'class="dfx-menu-button {{attributes.toolbar.rightMenu.buttons.actionButton.class}}" style="{{attributes.toolbar.rightMenu.buttons.actionButton.style}}" aria-label="buttons-button" >'+
                            '<md-icon ng-if="{{ifFaIcon}}" class="fa {{faIcon}} dfx-menu-button-icon {{attributes.toolbar.rightMenu.buttons.actionButton.icon.class}}" style="font-size:{{attributes.toolbar.rightMenu.buttons.actionButton.icon.size}}px; {{attributes.toolbar.rightMenu.buttons.actionButton.icon.style}}"></md-icon>'+
                            '<ng-md-icon ng-if="{{ifSvgIcon}}" icon="{{svgIcon}}" size="{{attributes.toolbar.rightMenu.buttons.actionButton.icon.size}}" class="dfx-menu-button-icon {{attributes.toolbar.rightMenu.buttons.actionButton.icon.class}}" style="{{attributes.toolbar.rightMenu.buttons.actionButton.icon.style}}"></ng-md-icon>'+
                            '<span>{{itemLabel}}</span>'+
                            '<span class="md-alt-text">{{itemShortcut}}</span>'+
                            '<small ng-if="{{ifItemNotification}}">{{itemNotification}}</small>'+
                            '</md-button>';
                        }
                        scope.iconbarArray = scope.attributes.toolbar.rightMenu.menuItems.value;
                        scope.rootMenuItem = scope.rightRootMenuItem;
                        if ( scope.attributes.toolbar.rightMenu.type.value === 'Buttons' ) {
                            scope.iconBar = '<md-menu-bar class="dfx_toolbar_menubar">';
                        } else {
                            scope.iconBar = '<md-menu-bar>';
                        }
                    }

                    for ( var item = 0; item < scope.iconbarArray.length; item++ ) {
                        if ( side === 'left' ) {
                            if ( scope.attributes.toolbar.leftMenu.type.value === 'Buttons' ) {
                                scope.iconBar = scope.iconBar + '<md-menu class="toolbar-button">';
                            } else {
                                scope.iconBar = scope.iconBar + '<md-menu>';
                            }
                        } else {
                            if ( scope.attributes.toolbar.rightMenu.type.value === 'Buttons' ) {
                                scope.iconBar = scope.iconBar + '<md-menu class="toolbar-button">';
                            } else {
                                scope.iconBar = scope.iconBar + '<md-menu>';
                            }
                        }
                        if ( scope.iconbarArray[item].menuItems.value.length > 0 ) {
                            createDfxMenuItem( scope.iconbarArray[item], 'rootMenuItem', undefined, item );
                            buildNextLevel( scope.iconbarArray[item].menuItems.value, item);
                            scope.iconBar = scope.iconBar + '</md-menu-content>';
                        } else {
                            createDfxMenuItem( scope.iconbarArray[item], 'rootMenuItem', undefined, item );
                        }
                        scope.iconBar = scope.iconBar + '</md-menu>';
                    };
                    scope.iconBar = scope.iconBar + '</md-menu-bar>';
                    scope.iconBarMenu = scope.iconBar;
                    if ( side==='left' ) {
                        if ( scope.attributes.toolbar.leftMenu.type.value === 'Icon Bar' ) {
                            $('#' + scope.component_id + '_left_menu_bar').html(scope.iconBarMenu);
                            $compile($('#' + scope.component_id + '_left_menu_bar').contents())(scope);
                        } else if ( scope.attributes.toolbar.leftMenu.type.value === 'Buttons' ) {
                            $('#' + scope.component_id + '_left_buttons_menu').html(scope.iconBarMenu);
                            $compile($('#' + scope.component_id + '_left_buttons_menu').contents())(scope);
                        }
                        scope.setButtonsWidth(scope.attributes.toolbar.leftMenu.equalButtonSize.value, 'left');
                    } else if ( side==='right' ) {
                        if ( scope.attributes.toolbar.rightMenu.type.value === 'Icon Bar' ) {
                            $('#' + scope.component_id + '_right_menu_bar').html(scope.iconBarMenu);
                            $compile($('#' + scope.component_id + '_right_menu_bar').contents())(scope);
                        } else if ( scope.attributes.toolbar.rightMenu.type.value === 'Buttons' ) {
                            $('#' + scope.component_id + '_right_buttons_menu').html(scope.iconBarMenu);
                            $compile($('#' + scope.component_id + '_right_buttons_menu').contents())(scope);
                        }
                        scope.setButtonsWidth(scope.attributes.toolbar.rightMenu.equalButtonSize.value, 'right');
                    }
                }, 0);
            };

            /*$timeout(function(){
                scope.attributes.toolbar.rightMenu.initialClick.value = false;
                scope.attributes.toolbar.leftMenu.initialClick.value = false;
            }, 0);*/

            scope.snippetTrustAsHtml = function( snippet ) {
                return $sce.trustAsHtml(snippet);
            };

            scope.$watch( "attributes.toolbar.title.isHtml.value", function( newValue ) {
                if ( newValue ) {
                    $timeout(function(){
                        var html_title = '#' + scope.component_id + '_toolbar_bindingHtml';
                        $compile($(html_title).contents())(scope);
                    }, 0);
                }
            });

            scope.closeOthers = function() {
                $mdMenu.hide(null, { closeAll: true });
            }

            scope.setButtonsWidth = function(isEqual, side){
                $timeout(function(){
                    if(side==='right'){
                        var parentDiv = '#' + scope.component_id + '_toolbar_right_menu';
                    }else{
                        var parentDiv = '#' + scope.component_id + '_toolbar_left_menu';
                    }

                if(isEqual && side==='right'){
                        var counter = 0;
                        for(var i =0; i < scope.attributes.toolbar.rightMenu.menuItems.value.length; i++){
                            if(!scope.attributes.toolbar.rightMenu.menuItems.value[i].divider){
                                counter++;
                            }
                        }
                        var percentValue = Math.floor(100/counter);
                        if(percentValue > 5){
                            $(parentDiv).css('width', '100%');
                            $($(parentDiv).find('md-menu-bar')[0]).children().css('width', (percentValue+'%'));
                        }else{
                            $(parentDiv).css('width', '');
                            $($(parentDiv).find('md-menu-bar')[0]).children().css('width', '');
                        }
                }else if(isEqual && side==='left'){
                    var counter = 0;
                    for(var i =0; i < scope.attributes.toolbar.leftMenu.menuItems.value.length; i++){
                        if(!scope.attributes.toolbar.leftMenu.menuItems.value[i].divider){
                            counter++;
                        }
                    }
                    var percentValue = Math.floor(100/counter);
                    if(percentValue > 5){
                        $(parentDiv).css('width', '100%');
                        $($(parentDiv).find('md-menu-bar')[0]).children().css('width', (percentValue+'%'));
                    }
                    }else{
                        $(parentDiv).css('width', '');
                        $($(parentDiv).find('md-menu-bar')[0]).children().css('width', '');
                }
                }, 0);
            };

            scope.rightFabClick = function(){
                scope.attributes.toolbar.rightMenu.initialClick.value = true;
            };
            scope.leftFabClick = function(){
                scope.attributes.toolbar.leftMenu.initialClick.value = true;
            };
            scope.checkIconType = function( menuList ) {
                for (var i = 0; i < menuList.length; i++) {
                    if ( !menuList[i].hasOwnProperty('iconType') ) { menuList[i].iconType = 'fa-icon'; }
                }
            }

            scope.ifShowToolbarIconTypes = function( icon, side, type ) {
                var regexp = /(^\')(.*)(\'$)/gm, filtered = regexp.exec( icon ), iconType = '';
                if ( icon && ( icon.indexOf('+') >= 0 ) ) { filtered = false; }
                if ( icon === '' ) { filtered = true; }
                if ( icon.indexOf("'") === 0 && icon.indexOf('+') === -1 && icon.charAt(icon.length-1) === "'" ) {
                    icon.indexOf("'fa-") === 0 ? iconType = 'fa-icon' : iconType = 'svg-icon';
                }
                if ( side === 'leftSide' ) {
                    switch ( type ) {
                        case 'fabTrigger':
                            if (iconType!=='') { scope.attributes.toolbar.leftMenu.fab.triggerButton.icon.type = iconType; }
                            if ( filtered ) {
                                if (!$("#toolbarLeftFabTrigger").hasClass('ng-hide')){$("#toolbarLeftFabTrigger").addClass('ng-hide');}
                            } else {
                                $("#toolbarLeftFabTrigger").removeClass('ng-hide');
                            }
                            break;
                    }
                } else if ( side === 'rightSide' ){
                    switch ( type ) {
                        case 'fabTrigger':
                            if (iconType!=='') { scope.attributes.toolbar.rightMenu.fab.triggerButton.icon.type = iconType; }
                            if ( filtered ) {
                                if (!$("#toolbarRightFabTrigger").hasClass('ng-hide')){$("#toolbarRightFabTrigger").addClass('ng-hide');}
                            } else {
                                $("#toolbarRightFabTrigger").removeClass('ng-hide');
                            }
                            break;
                    }
                }
            }

            scope.$parent.checkToolbarMenus = function(toolbar_visible){
                if(toolbar_visible && toolbar_visible!=='false'){
                    if(scope.attributes.toolbar.leftMenu.visible && scope.attributes.toolbar.leftMenu.visible!=='false' && scope.attributes.toolbar.leftMenu.type.value !== 'Fab') scope.iconbarBuilder('left');
                    if(scope.attributes.toolbar.rightMenu.visible && scope.attributes.toolbar.rightMenu.visible!=='false' && scope.attributes.toolbar.rightMenu.type.value !== 'Fab') scope.iconbarBuilder('right');
                }
            }

            scope.$watch("attributes.toolbar.rightMenu.type.value", function(newValue){
                if(newValue){
                    $timeout(function(){
                        var parentDiv = '#' + scope.component_id + '_toolbar_right_menu';
                        if(newValue === 'Icon Bar'){
                            $(parentDiv).css('width', '');
                            scope.attributes.toolbar.rightMenu.equalButtonSize.value = false;
                            scope.iconbarBuilder('right');
                        }else if (newValue === 'Fab') {
                            $(parentDiv).css('width', '');
                            scope.attributes.toolbar.rightMenu.equalButtonSize.value = false;
                            scope.checkIconType( scope.attributes.toolbar.rightMenu.menuItems.value );
                        }else if(newValue === 'Buttons'){
                            scope.iconbarBuilder('right');
                        }
                    },0);
                }

            });

            scope.$watch("attributes.toolbar.leftMenu.type.value", function(newValue){
                if(newValue) {
                    $timeout(function () {
                        var parentDiv = '#' + scope.component_id + '_toolbar_left_menu';
                        if(newValue === 'Icon Bar'){
                            $(parentDiv).css('width', '');
                            scope.attributes.toolbar.leftMenu.equalButtonSize.value = false;
                            scope.iconbarBuilder('left');
                        }else if (newValue === 'Fab') {
                            $(parentDiv).css('width', '');
                            scope.attributes.toolbar.leftMenu.equalButtonSize.value = false;
                            scope.checkIconType( scope.attributes.toolbar.leftMenu.menuItems.value );
                        }else if(newValue === 'Buttons'){
                            scope.iconbarBuilder('left');
                        }
                    }, 0);
                }
            });

            scope.$watch('attributes.toolbar.leftMenu.fab.triggerButton.icon.value', function(newValue){
                if (newValue) {
                    scope.ifShowToolbarIconTypes( newValue, 'leftSide', 'fabTrigger' );
                }
            }, true);

            scope.$watch('attributes.toolbar.rightMenu.fab.triggerButton.icon.value', function(newValue){
                if (newValue) {
                    scope.ifShowToolbarIconTypes( newValue, 'rightSide', 'fabTrigger' );
                }
            }, true);

            scope.$watch('attributes.toolbar.leftMenu.menuItems.value', function(newVal, oldVal) {
                if(newVal){
                    if (newVal != null && !angular.equals(newVal, oldVal)) {
                        $timeout(function() {
                            if(scope.attributes.toolbar.leftMenu.type.value !== 'Fab'){
                                scope.iconbarBuilder('left');
                            }
                        }, 0);
                    }
                }
            }, true);

            scope.$watch('attributes.toolbar.rightMenu.menuItems.value', function(newVal, oldVal) {
                if(newVal){
                    if (newVal != null && !angular.equals(newVal, oldVal)) {
                        $timeout(function() {
                            if(scope.attributes.toolbar.rightMenu.type.value !== 'Fab') {
                                scope.iconbarBuilder('right');
                            }
                        }, 0);
                    }
                }
            }, true);

            scope.$watch("attributes.toolbar.leftMenu.equalButtonSize.value", function(newValue){
                if(newValue){
                    scope.setButtonsWidth(newValue, 'left');
                }
            });

            scope.$watch("attributes.toolbar.rightMenu.equalButtonSize.value", function(newValue){
                if(newValue){
                    scope.setButtonsWidth(newValue, 'right');
                }
            });
            scope.$watch("attributes.toolbar.leftMenu.dynamic.value", function(newValue){
                if(newValue){
                    $timeout(function(){
                        if (scope.attributes.toolbar.leftMenu.dynamicPresent==null) {
                            scope.attributes.toolbar.leftMenu.dynamicPresent = { "value": "" };
                            scope.attributes.toolbar.leftMenu.dynamic = { "value": "" };
                        }
                        if(typeof newValue !== "undefined" && newValue !== null && newValue !== ""){
                            scope.attributes.toolbar.leftMenu.dynamicPresent.value = true;
                        }else{
                            scope.attributes.toolbar.leftMenu.dynamicPresent.value = false;
                        }
                    }, 0);
                }

            });
            scope.$watch("attributes.toolbar.rightMenu.dynamic.value", function(newValue){
                if(newValue){
                    $timeout(function(){
                        if (scope.attributes.toolbar.rightMenu.dynamicPresent==null) {
                            scope.attributes.toolbar.rightMenu.dynamicPresent = { "value": "" };
                            scope.attributes.toolbar.rightMenu.dynamic = { "value": "" };
                        }
                        if(typeof newValue !== "undefined" && newValue !== null && newValue !== ""){
                            scope.attributes.toolbar.rightMenu.dynamicPresent.value = true;
                        }else{
                            scope.attributes.toolbar.rightMenu.dynamicPresent.value = false;
                        }
                    }, 0);
                }
            });
            scope.$watch('attributes.toolbar.leftMenu.visible.value', function(newValue){
                if(newValue){
                    if(newValue !== '' && newValue !== 'false' && scope.attributes.toolbar.leftMenu.type.value !== 'Fab' ){
                        scope.iconbarBuilder('left');
                    }
                }
            });
            scope.$watch('attributes.toolbar.rightMenu.visible.value', function(newValue){
                if(newValue){
                    if(newValue !== '' && newValue !== 'false' && scope.attributes.toolbar.rightMenu.type.value !== 'Fab' ){
                        scope.iconbarBuilder('right');
                    }
                }
            });
        }
    }
});

dfxViewEditorApp.directive('dfxVeListEditor', ['$mdDialog', '$timeout', '$http', '$q', '$compile', '$mdToast', function($mdDialog, $timeout, $http, $q, $compile, $mdToast) {
    return {
        restrict: 'E',
        transclude: true,
        replace: true,
        templateUrl: function( el, attrs ) {
            return '/gcontrols/web/picker_list.html';
        },
        link: function(scope, element, attrs) {
            var opt = '',
                counter = 1,
                scriptEditor,
                itemIndex = 0,
                container = '',
                sampleGet = {},
                movedOption = {},
                sampleToAdd = '',
                gcJsonSample = {},
                sampleStringified = '',
                dfxSampleJsonEditor = null,
                scriptSampleNameValid = {"value": false};
                optionData = "<img src='https://material.angularjs.org/latest/img/list/60.jpeg?0' class='md-avatar' alt='Janet Perkins' /><div class='md-list-item-text' layout='column'><h3>Min Li Chan</h3><h4>Brunch this weekend?</h4><p>I'll be in your neighborhood doing errands</p></div>";
                scope.htmlType = '';
                scope.currentItem = {};
                scope.gcSamplesArray = [];
                scope.scriptSampleName = '';
            scope.showListEditor = function(ev) {
                $mdDialog.show({
                    scope: scope.$new(),
                    parent: angular.element(document.body),
                    targetEvent: ev,
                    clickOutsideToClose:true,
                    escapeToClose: false,
                    ariaLabel: 'options-editor',
                    templateUrl: '/gcontrols/web/list_options_editor.html',
                    onComplete: function(){
                        scope.activeOption(itemIndex);
                        $('#dfx-ve-menu-editor-dialog').keyup(function(e) {
                            if(e.which === 13 && $('#dfx-ve-expression-menu-dialog').length === 0 && $('#dfx-ve-html-menu-editor').length === 0) {
                                if(document.activeElement.tagName!=='BUTTON')  scope.closeDialog();
                            }
                            if(e.which === 27) scope.closeDialog();
                            e.preventDefault();
                            e.stopPropagation();
                        });
                    },
                    controller: function(){
                        itemIndex = 0;scope.currentItem = {};
                    }
                });
            };
            scope.setOptionsType = function( type ){
                if (type == 'static') {
                    scope.attributes.static.status = "overridden";
                    scope.attributes.optionItemNames.status = "";
                } else if (type == 'dynamic') {
                    scope.attributes.static.status = "";
                    scope.attributes.optionItemNames.status = 'overridden';
                }
                scope.attributes.optionsType.status = "overridden";
            };
            scope.closeDialog = function(){$mdDialog.hide();}
            scope.activeOption = function(index) {
                itemIndex = index;
                scope.currentItem = scope.attributes.static.value[index];
                $('.menu-structure li').removeClass('active');
                $('.menu-structure li').eq(index).addClass('active');
            }
            scope.selectItem = function(index){scope.activeOption(index);}
            scope.addItem = function(){
                scope.attributes.static.status = "overridden" ;
                itemIndex++; counter++; opt = "list item " + counter;
                scope.attributes.static.value.splice(itemIndex, 0, {"name": opt, "data": optionData});
                $timeout(function(){scope.activeOption(itemIndex);}, 0);
            };
            scope.moveItemUp = function(){
                if(itemIndex > 0) {
                    movedOption = scope.currentItem;
                    scope.attributes.static.value.splice(itemIndex, 1);
                    --itemIndex;
                    scope.attributes.static.value.splice(itemIndex, 0, movedOption);
                    scope.activeOption(itemIndex);
                }
            }
            scope.moveItemDown = function() {
                if(itemIndex < (scope.attributes.static.value.length - 1)){
                    movedOption = scope.currentItem;
                    scope.attributes.static.value.splice(itemIndex, 1);
                    ++itemIndex;
                    scope.attributes.static.value.splice(itemIndex, 0, movedOption);
                    scope.activeOption(itemIndex);
                }
            }
            scope.removeItem = function(){
                scope.attributes.static.status = "overridden";
                if(scope.attributes.static.value.length === 1){itemIndex = 0;}
                else{scope.attributes.static.value.splice(itemIndex, 1);if(itemIndex > 0) --itemIndex;}
                scope.activeOption(itemIndex);
            };
            scope.showHtmlEditor = function(ev, htmlValue, type) {
                scope.htmlType = type;
                $('#' + scope.component_id + '_md_dialog .second-dialog-box').load('/gcontrols/web/html_editor_dialog.html', function(){
                    $compile($('.second-dialog-box').contents())(scope);
                    var myTextArea = document.getElementById('dfx_html_editor');
                    scope.htmlEditor = CodeMirror(function (elt) {
                            myTextArea.parentNode.replaceChild(elt, myTextArea);
                        },
                        {
                            lineNumbers: true,
                            value: htmlValue,
                            mode: {name: "xml", globalVars: true},
                            matchBrackets: true,
                            highlightSelectionMatches: {showToken: /\w/},
                            styleActiveLine: true,
                            viewportMargin : Infinity,
                            extraKeys: {"Alt-F": "findPersistent", "Ctrl-Space": "autocomplete"},
                            lineWrapping: true
                        });
                    scope.htmlEditor.setSize(856, 380);
                    $timeout(function(){
                        scope.htmlEditor.refresh();
                        scope.htmlEditor.focus();
                        $('#dfx-ve-html-menu-editor').keyup(function(e) {
                            if(e.which === 13) {
                                if(document.activeElement.tagName!=='TEXTAREA' && document.activeElement.tagName!=='BUTTON') scope.setHtmlValue();
                            }
                            if(e.which === 27) scope.hideHtmlEditor();
                            e.preventDefault();
                            e.stopPropagation();
                        });
                    },0);
                    $(scope.htmlEditor.getWrapperElement()).attr("id", "dfx_html_editor");
                    $('#' + scope.component_id + '_md_dialog .second-dialog').fadeIn(250);
                });
            }
            scope.setHtmlValue = function() {
                switch(scope.htmlType){
                    case 'custom_dynamic_item_template':
                        scope.attributes.customTemplate.value.template = scope.htmlEditor.getValue();
                        break;
                    default:
                        scope.currentItem.data = scope.htmlEditor.getValue();
                }
                scope.hideHtmlEditor();
            }
            scope.hideHtmlEditor = function() {
                $(".second-dialog").fadeOut('250', function() { $(this).remove(); });
            }
            scope.focusSamples = function(type){
                if(type === 'dynamic'){
                    $timeout(function(){$("#samples-btn").focus();},100);}
                }
            scope.runJsonEditor = function(model){
                dfxSampleJsonEditor = null;
                container = document.getElementById('dfx-ve-sample-json');
                options = {mode: 'code', modes: ['tree','form','code','text','view'], history: true};
                $timeout(function(){
                    dfxSampleJsonEditor = new JSONEditor(container, options, model);
                    // dfxSampleJsonEditor.expandAll();
                }, 0);
            }
            scope.checkItemNames = function(item){
                if(item.hasOwnProperty('data')){scope.attributes.optionItemNames.value.data = 'data';}
            }
            scope.fillPropertiesNames = function(sampleJson){for(var i = 0; i<sampleJson.length; i++){scope.checkItemNames(sampleJson[i]);};}
            scope.showSamples = function(){
                samplesLoaded = $http.get('/gcontrols/web/gcs_json_samples.json').then(function(res){
                    scope.gcSamplesArray = res.data['list'];
                    gcJsonSample = scope.gcSamplesArray[0];
                });
                $q.all([samplesLoaded]).then(function(){
                    $('body').append('<div class="dfx-ve-dialog"></div>');
                    $('.dfx-ve-dialog').load('/gcontrols/web/gcs_json_samples.html', function(){
                        $compile($('.dfx-ve-dialog').contents())(scope);
                        $('.sp-container').remove();
                        $('.dfx-ve-content-dialog').addClass('active');
                        $('#dfx-ve-gc-samples-dialog').keyup(function(e) {
                            if(e.which === 13) {
                                var activeTagName = document.activeElement.tagName;
                                if(activeTagName!=='TEXTAREA' && activeTagName!=='BUTTON') $('#dfx-copy-sample-btn').click();
                            }
                            if(e.which === 27) scope.closeSamples();
                            e.preventDefault();
                            e.stopPropagation();
                        });
                        $timeout(function(){
                            scope.runJsonEditor(scope.gcSamplesArray[0].value);
                            $(".dfx-ve-content-categories li").eq(0).find('span').addClass('active');
                            scope.scriptSampleName!=='' ? $("#dfx-copy-sample-btn").focus() : $("#dfx-json-sample-name").focus();
                        }, 250);
                    });
                });
            }
            scope.selectSample = function(ev, sample){
                scope.attributes.customTemplate.value.template = sample.hasOwnProperty('template') ? sample.template : '';
                gcJsonSample = sample;
                dfxSampleJsonEditor ? dfxSampleJsonEditor.set(sample.value) : scope.runJsonEditor(sample.value);
                // dfxSampleJsonEditor.expandAll();
                $(".dfx-ve-content-categories span").removeClass('active');
                $(ev.target).addClass('active');
                scope.scriptSampleName!=='' ? $("#dfx-copy-sample-btn").focus() : $("#dfx-json-sample-name").focus();
            }
            scope.addSampleToScript = function(){
                if(gcJsonSample.hasOwnProperty('template')) {
                    scope.attributes.customTemplate.value.template = gcJsonSample.template;
                    scope.attributes.customTemplate.value.enabled = true;
                    scope.attributes.customTemplate.status = 'overridden';
                } else {
                    scope.attributes.customTemplate.value.template = '';
                    scope.attributes.customTemplate.value.enabled = false;
                    scope.fillPropertiesNames(gcJsonSample.value);
                    delete scope.attributes.customTemplate.status;
                }
                sampleGet = dfxSampleJsonEditor.get();
                sampleStringified = JSON.stringify(sampleGet, null, '\t');
                sampleStringified = sampleStringified.split("\n").join("\n\t");
                scriptEditor = $('#dfx_script_editor.CodeMirror')[0].CodeMirror;
                $q.all([ scope.fillPropertiesNames, scope.checkItemNames ]).then(function(){
                    scope.attributes.optionItemNames.value.source = scope.scriptSampleName;
                    scope.closeDialog();
                    scope.closeSamples();
                    $timeout(function(){
                        scope.changeViewMode('script');
                        scriptEditor.focus();
                        scriptEditor.setCursor({line: 4, ch: 0});
                        sampleToAdd = "\t$scope." + scope.scriptSampleName + " = " + sampleStringified + ";\n";
                        scriptEditor.replaceSelection(sampleToAdd);
                        scope.changeViewMode('design');
                        $mdToast.show(
                            $mdToast.simple()
                            .textContent('JSON Sample "'+gcJsonSample.name+'" has been added to the Script.')
                            .theme('success-toast').position('top right').hideDelay(3000)
                        );
                        scope.closeDialog();
                    }, 250);
                });
            }
            scope.closeSamples = function(){
                $('.dfx-ve-content-dialog').removeClass('active');
                angular.element($('.dfx-ve-dialog')).remove();
                $('.sp-container').remove();
                if($('#dfx-ve-menu-editor-dialog').length > 0) $('#dfx-ve-menu-editor-dialog').focus();
            }
        }
    }
}]);

dfxViewEditorApp.directive('dfxGcToolbarProperty', function($mdDialog) {
    return {
        restrict: 'A',
        templateUrl: function( el, attrs) {
            return '/gcontrols/web/toolbar_props.html';
        },
        link: function(scope, element, attrs) {
            scope.showCodemirror = function(ev) {
                $mdDialog.show({
                    scope: scope.$new(),
                    parent: angular.element(document.body),
                    targetEvent: ev,
                    clickOutsideToClose:true,
                    templateUrl: '/gcontrols/web/html_editor_template.html',
                    onComplete:function(scope){
                        var myTextArea = document.getElementById('dfx_html_editor');
                        var scriptEditor = CodeMirror(function (elt) {
                                myTextArea.parentNode.replaceChild(elt, myTextArea);
                            },
                            {
                                lineNumbers: true,
                                value: (scope.attributes.toolbar.title.content.value !== '') ? scope.attributes.toolbar.title.content.value : $('#dfx_html_editor').text(),
                                mode: {name: "xml", globalVars: true},
                                matchBrackets: true,
                                highlightSelectionMatches: {showToken: /\w/},
                                styleActiveLine: true,
                                viewportMargin : Infinity,
                                extraKeys: {"Alt-F": "findPersistent", "Ctrl-Space": "autocomplete"},
                                lineWrapping: true
                            });
                        scriptEditor.setSize(800, 400);
                        $(scriptEditor.getWrapperElement()).attr("id", "dfx_html_editor");
                    },
                    controller: function(scope){
                        scope.closeDialog = function() {
                            $mdDialog.hide();
                        }
                        scope.saveDialog = function() {
                            var editor = $('#dfx_html_editor.CodeMirror')[0].CodeMirror;
                            scope.attributes.toolbar.title.content.value = editor.getValue();
                            scope.attributes.toolbar.title.content.status = 'overridden';
                            $mdDialog.hide();
                        }
                    }
                })
            };
        }
    }
});

dfxViewEditorApp.directive('dfxVePlatform', function() {
    return {
        restrict: 'A',
        scope: false,
        link: function(scope, element, attrs) {
            if (scope.view_platform == 'mobile') {
                scope.refreshDevice();
            } else {
                element.css('width', '100%');
            }
        }
    }
});


dfxViewEditorApp.directive('dfxViewCompiled', [ '$compile', function($compile) {
    return {
        restrict: 'A',
        controller: function($scope, $element, $attrs) {
            $scope.view_id = $attrs.dfxViewCompiled;
            var widget_definition = JSON.parse(window.localStorage.getItem( 'dfx_' + $attrs.dfxViewCompiled ));
            $scope.addCompiledComponents( widget_definition.definition, { 'id': 'dfx-ve-compiled' }, 'default' );
        }
    }
}]);

var helpDialogScript = function (options) {
    if (!options.varName) options.varName = "test";
    if (options.item == 'apiroute-search') {
        var ve_scope = angular.element(document.getElementById('dfx_src_widget_editor')).scope();
        ve_scope.searchAPIRoute();
    } else {
        var editor_script          = $('#dfx_script_editor.CodeMirror')[0].CodeMirror;
        var widget_name            = DfxVisualBuilder.getWidgetName();
        var widget_controller_name = DfxVisualBuilder.getWidgetControllerName();
        var script                 = '';

        if (options.item == 'module') {
            script = "var " + widget_name + " = angular.module('" + widget_name + "', ['dfxAppServices']);";
        } else if (options.item == 'controller') {
            script = widget_name + ".controller( '" + widget_controller_name + "', [ '$scope', 'dfxApiRoutes', function( $scope, dfxApiRoutes ) {\n"
            + "\t\n"
            + "}]);\n";
        } else if (options.item == 'function') {
            script = "$scope." + options.varName + " = function(arg) {\n"
            + "\t\treturn '';\n"
            + "\t};\n";
        } else if (options.item == 'apiroute-get') {
            script = "$scope." + options.varName + " = [];\n";
            + "dfxApiRoutes.get( $scope, 'bpm/test', {}, function(data) {\n"
            + "\t\t\t// Put your callback code here\n"
            + "}, '', $scope." + options.varName + ");\n";
        } else if (options.item == 'apiroute-post') {
            script = "dfxApiRoutes.post( $scope, 'service/path', {} , {} , function(data) {\n"
            + "\t\t\t$scope.$apply(function(){\n"
            + "\t\t\t\t$scope." + options.varName + " = data;\n"
            + "\t\t\t});\n"
            + "\t\t});\n";
        } else if (options.item == 'barchart') {
            script = "$scope." + options.varName + " = [{\n"
            + "\t\tkey: 'Cumulative Return',\n"
            + "\t\tvalues: [\n"
            + "\t\t\t{\n"
            + "\t\t\t\t'label': 'A',\n"
            + "\t\t\t\t'value': -29.76\n"
            + "\t\t\t},\n"
            + "\t\t\t{\n"
            + "\t\t\t\t'label': 'B',\n"
            + "\t\t\t\t'value': 32.80\n"
            + "\t\t\t},\n"
            + "\t\t\t{\n"
            + "\t\t\t\t'label': 'C',\n"
            + "\t\t\t\t'value': 196.45\n"
            + "\t\t\t},\n"
            + "\t\t\t{\n"
            + "\t\t\t\t'label': 'D',\n"
            + "\t\t\t\t'value': -98.07\n"
            + "\t\t\t},\n"
            + "\t\t\t{\n"
            + "\t\t\t\t'label': 'E',\n"
            + "\t\t\t\t'value': -13.92\n"
            + "\t\t\t}\n"
            + "\t\t]\n"
            + "\t}];\n";
            if (options.optionsVarName) {
                script += "\t$scope." + options.optionsVarName + " = {\n"
                + "\t\tchart: {\n"
                + "\t\t\ttype: 'discreteBarChart',\n"
                + "\t\t\tmargin : {\n"
                + "\t\t\t\ttop: 20,\n"
                + "\t\t\t\tright: 20,\n"
                + "\t\t\t\tbottom: 50,\n"
                + "\t\t\t\tleft: 55\n"
                + "\t\t\t},\n"
                + "\t\t\tx: function(d){return d.label;},\n"
                + "\t\t\ty: function(d){return d.value;},\n"
                + "\t\t\tshowValues:  true,\n"
                + "\t\t\tvalueFormat: function (d) {\n"
                + "\t\t\t\treturn d3.format(',.4f')(d);\n"
                + "\t\t\t},\n"
                + "\t\t\tduration:    500,\n"
                + "\t\t\txAxis:       {\n"
                + "\t\t\t\taxisLabel: 'X Axis'\n"
                + "\t\t\t},\n"
                + "\t\t\tyAxis:       {\n"
                + "\t\t\t\taxisLabel: 'Y Axis',\n"
                + "\t\t\t\taxisLabelDistance: -10\n"
                + "\t\t\t}\n"
                + "\t\t},\n"
                + "\t\ttitle: {\n"
                + "\t\t\ttext: 'Bar Chart',\n"
                + "\t\t\tenable: true\n"
                + "\t\t}\n"
                + "\t};\n";
            }
        } else if (options.item == 'hzbarchart') {
            script = "$scope." + options.varName + " = [\n"
            + "\t\t{\n"
            + "\t\t\tkey: 'Series1',\n"
            + "\t\t\tcolor: '#d62728',\n"
            + "\t\t\tvalues: [\n"
            + "\t\t\t\t{\n"
            + "\t\t\t\t\t'label': 'Group A',\n"
            + "\t\t\t\t\t'value': -1.874\n"
            + "\t\t\t\t},\n"
            + "\t\t\t\t{\n"
            + "\t\t\t\t\t'label': 'Group B',\n"
            + "\t\t\t\t\t'value': -8.096\n"
            + "\t\t\t\t},\n"
            + "\t\t\t\t{\n"
            + "\t\t\t\t\t'label': 'Group C',\n"
            + "\t\t\t\t\t'value': -0.570\n"
            + "\t\t\t\t},\n"
            + "\t\t\t\t{\n"
            + "\t\t\t\t\t'label': 'Group D',\n"
            + "\t\t\t\t\t'value': -2.417\n"
            + "\t\t\t\t},\n"
            + "\t\t\t\t{\n"
            + "\t\t\t\t\t'label': 'Group E',\n"
            + "\t\t\t\t\t'value': -0.720\n"
            + "\t\t\t\t}\n"
            + "\t\t\t]\n"
            + "\t\t},\n"
            + "\t\t{\n"
            + "\t\t\tkey: 'Series2',\n"
            + "\t\t\tcolor: '#1f77b4',\n"
            + "\t\t\tvalues: [\n"
            + "\t\t\t\t{\n"
            + "\t\t\t\t\t'label': 'Group A',\n"
            + "\t\t\t\t\t'value': 25.307\n"
            + "\t\t\t\t},\n"
            + "\t\t\t\t{\n"
            + "\t\t\t\t\t'label': 'Group B',\n"
            + "\t\t\t\t\t'value': 16.756\n"
            + "\t\t\t\t},\n"
            + "\t\t\t\t{\n"
            + "\t\t\t\t\t'label': 'Group C',\n"
            + "\t\t\t\t\t'value': 18.451\n"
            + "\t\t\t\t},\n"
            + "\t\t\t\t{\n"
            + "\t\t\t\t\t'label': 'Group D',\n"
            + "\t\t\t\t\t'value': 8.614\n"
            + "\t\t\t\t},\n"
            + "\t\t\t\t{\n"
            + "\t\t\t\t\t'label': 'Group E',\n"
            + "\t\t\t\t\t'value': 7.808\n"
            + "\t\t\t\t}\n"
            + "\t\t\t]\n"
            + "\t\t}\n"
            + "\t];\n";
            if (options.optionsVarName) {
                script += "\t$scope." + options.optionsVarName + " = {\n"
                + "\t\tchart: {\n"
                + "\t\t\ttype: 'multiBarHorizontalChart',\n"
                + "\t\t\tmargin : {\n"
                + "\t\t\t\ttop: 20,\n"
                + "\t\t\t\tright: 20,\n"
                + "\t\t\t\tbottom: 50,\n"
                + "\t\t\t\tleft: 55\n"
                + "\t\t\t},\n"
                + "\t\t\tx: function(d){return d.label;},\n"
                + "\t\t\ty: function(d){return d.value;},\n"
                + "\t\t\tshowControls: true,\n"
                + "\t\t\tshowValues: true,\n"
                + "\t\t\tduration:    500,\n"
                + "\t\t\txAxis:       {\n"
                + "\t\t\t\tshowMaxMin: false,\n"
                + "\t\t\t\taxisLabel: ''\n"
                + "\t\t\t},\n"
                + "\t\t\tyAxis:       {\n"
                + "\t\t\t\taxisLabel: 'Values',\n"
                + "\t\t\t\ttickFormat: function(d) {\n"
                + "\t\t\t\t\treturn d3.format(',.2f')(d);\n"
                + "\t\t\t\t}\n"
                + "\t\t\t}\n"
                + "\t\t},\n"
                + "\t\ttitle: {\n"
                + "\t\t\ttext: 'Horizontal Bar Chart',\n"
                + "\t\t\tenable: true\n"
                + "\t\t}\n"
                + "\t};\n";
            }
        } else if (options.item == 'piechart') {
            script = "$scope." + options.varName + " = [\n"
            + "\t\t{\n"
            + "\t\t\t'key': 'One',\n"
            + "\t\t\t'y': 5\n"
            + "\t\t},\n"
            + "\t\t{\n"
            + "\t\t\t'key': 'Two',\n"
            + "\t\t\t'y': 2\n"
            + "\t\t},\n"
            + "\t\t{\n"
            + "\t\t\t'key': 'Three',\n"
            + "\t\t\t'y': 9\n"
            + "\t\t},\n"
            + "\t\t{\n"
            + "\t\t\t'key': 'Four',\n"
            + "\t\t\t'y': 7\n"
            + "\t\t},\n"
            + "\t\t{\n"
            + "\t\t\t'key': 'Five',\n"
            + "\t\t\t'y': 4\n"
            + "\t\t}\n"
            + "\t];\n";
            if (options.optionsVarName) {
                script += "\t$scope." + options.optionsVarName + " = {\n"
                + "\t\tchart: {\n"
                + "\t\t\ttype: 'pieChart',\n"
                + "\t\t\tmargin : {\n"
                + "\t\t\t\ttop: 20,\n"
                + "\t\t\t\tright: 20,\n"
                + "\t\t\t\tbottom: 50,\n"
                + "\t\t\t\tleft: 55\n"
                + "\t\t\t},\n"
                + "\t\t\tx: function(d){return d.key;},\n"
                + "\t\t\ty: function(d){return d.y;},\n"
                + "\t\t\tshowValues:  true,\n"
                + "\t\t\tduration: 500,\n"
                + "\t\t\tlabelThreshold: 0.01,\n"
                + "\t\t\tlabelSunbeamLayout: true,\n"
                + "\t\t\tlegend: {\n"
                + "\t\t\t\tmargin: {\n"
                + "\t\t\t\t\ttop: 5,\n"
                + "\t\t\t\t\tright: 35,\n"
                + "\t\t\t\t\tbottom: 5,\n"
                + "\t\t\t\t\tleft: 0\n"
                + "\t\t\t\t}\n"
                + "\t\t\t}\n"
                + "\t\t},\n"
                + "\t\ttitle: {\n"
                + "\t\t\ttext: 'Pie Chart',\n"
                + "\t\t\tenable: true\n"
                + "\t\t}\n"
                + "\t};\n";
            }
        } else if (options.item == 'donutchart') {
            script = "$scope." + options.varName + " = [\n"
            + "\t\t{\n"
            + "\t\t\t'key': 'One',\n"
            + "\t\t\t'y': 5\n"
            + "\t\t},\n"
            + "\t\t{\n"
            + "\t\t\t'key': 'Two',\n"
            + "\t\t\t'y': 2\n"
            + "\t\t},\n"
            + "\t\t{\n"
            + "\t\t\t'key': 'Three',\n"
            + "\t\t\t'y': 9\n"
            + "\t\t},\n"
            + "\t\t{\n"
            + "\t\t\t'key': 'Four',\n"
            + "\t\t\t'y': 7\n"
            + "\t\t},\n"
            + "\t\t{\n"
            + "\t\t\t'key': 'Five',\n"
            + "\t\t\t'y': 4\n"
            + "\t\t}\n"
            + "\t];\n";
            if (options.optionsVarName) {
                script += "\t$scope." + options.optionsVarName + " = {\n"
                + "\t\tchart: {\n"
                + "\t\t\ttype: 'pieChart',\n"
                + "\t\t\tdonut: true,\n"
                + "\t\t\tmargin : {\n"
                + "\t\t\t\ttop: 20,\n"
                + "\t\t\t\tright: 20,\n"
                + "\t\t\t\tbottom: 50,\n"
                + "\t\t\t\tleft: 55\n"
                + "\t\t\t},\n"
                + "\t\t\tx: function(d){return d.key;},\n"
                + "\t\t\ty: function(d){return d.y;},\n"
                + "\t\t\tshowValues: true,\n"
                + "\t\t\tdonutRatio: 0.35,\n"
                + "\t\t\tduration: 500,\n"
                + "\t\t\tlegend: {\n"
                + "\t\t\t\tmargin: {\n"
                + "\t\t\t\t\ttop: 5,\n"
                + "\t\t\t\t\tright: 35,\n"
                + "\t\t\t\t\tbottom: 5,\n"
                + "\t\t\t\t\tleft: 0\n"
                + "\t\t\t\t}\n"
                + "\t\t\t},\n"
                + "\t\t\tpie: {\n"
                + "\t\t\t\tstartAngle: function(d) { return d.startAngle - Math.PI },\n"
                + "\t\t\t\tendAngle: function(d) { return d.endAngle - Math.PI }\n"
                + "\t\t\t}\n"
                + "\t\t},\n"
                + "\t\ttitle: {\n"
                + "\t\t\ttext: 'Donut Chart',\n"
                + "\t\t\tenable: true\n"
                + "\t\t}\n"
                + "\t};\n";
            }
        } else if (options.item == 'linechart') {
            script = "function lineChartDesignData() {\n"
            + "\t\tvar sin = [], sin2 = [], cos = [];\n"
            + "\t\t//Data is represented as an array of {x,y} pairs.\n"
            + "\t\tfor (var i = 0; i < 100; i++) {\n"
            + "\t\t\tsin.push({x: i, y: Math.sin(i / 10)});\n"
            + "\t\t\tsin2.push({x: i, y: i % 10 == 5 ? null : Math.sin(i / 10) * 0.25 + 0.5});\n"
            + "\t\t\tcos.push({x: i, y: .5 * Math.cos(i / 10 + 2) + Math.random() / 10});\n"
            + "\t\t}\n"
            + "\t\t//Line chart data should be sent as an array of series objects.\n"
            + "\t\treturn [\n"
            + "\t\t\t{\n"
            + "\t\t\t\tvalues: sin,      //values - represents the array of {x,y} data points\n"
            + "\t\t\t\tkey:    'Sine Wave', //key  - the name of the series.\n"
            + "\t\t\t\tcolor:  '#ff7f0e'  //color - optional: choose your own line color.\n"
            + "\t\t\t},\n"
            + "\t\t\t{\n"
            + "\t\t\t\tvalues: cos,\n"
            + "\t\t\t\tkey:    'Cosine Wave',\n"
            + "\t\t\t\tcolor:  '#2ca02c'\n"
            + "\t\t\t},\n"
            + "\t\t\t{\n"
            + "\t\t\t\tvalues: sin2,\n"
            + "\t\t\t\tkey:    'Another sine wave',\n"
            + "\t\t\t\tcolor:  '#7777ff',\n"
            + "\t\t\t\tarea:   true      //area - set to true if you want this line to turn into a filled area chart.\n"
            + "\t\t\t}\n"
            + "\t\t];\n"
            + "\t};\n"
            + "\t$scope." + options.varName + " = lineChartDesignData();\n";
            if (options.optionsVarName) {
                script += "\t$scope." + options.optionsVarName + " = {\n"
                + "\t\tchart: {\n"
                + "\t\t\ttype: 'lineChart',\n"
                + "\t\t\tmargin : {\n"
                + "\t\t\t\ttop: 20,\n"
                + "\t\t\t\tright: 20,\n"
                + "\t\t\t\tbottom: 50,\n"
                + "\t\t\t\tleft: 55\n"
                + "\t\t\t},\n"
                + "\t\t\tx: function(d){return d.x;},\n"
                + "\t\t\ty: function(d){return d.y;},\n"
                + "\t\t\tuseInteractiveGuideline: true,\n"
                + "\t\t\txAxis:       {\n"
                + "\t\t\t\taxisLabel: 'Time (ms)'\n"
                + "\t\t\t},\n"
                + "\t\t\tyAxis:       {\n"
                + "\t\t\t\taxisLabel: 'Voltage (v)',\n"
                + "\t\t\t\taxisLabelDistance: -10\n"
                + "\t\t\t}\n"
                + "\t\t},\n"
                + "\t\ttitle: {\n"
                + "\t\t\ttext: 'Line Chart',\n"
                + "\t\t\tenable: true\n"
                + "\t\t}\n"
                + "\t};\n";
            }
        } else if (options.item == 'cmlinechart') {
            script = "$scope." + options.varName + " = [\n"
            + "\t\t{\n"
            + "\t\t\t'key': 'Long',\n"
            + "\t\t\t'values': [ [ 1283227200000, 248.308], [ 1285819200000, 278.148], [ 1288497600000, 292.692], [ 1291093200000, 300.842], [ 1293771600000, 326.172]],\n"
            + "\t\t\t'mean': 250\n"
            + "\t\t},\n"
            + "\t\t{\n"
            + "\t\t\t'key': 'Short',\n"
            + "\t\t\t'values': [ [ 1283227200000, -85.397], [ 1285819200000, -94.738], [ 1288497600000, -98.661], [ 1291093200000, -99.609], [ 1293771600000, -103.570]],\n"
            + "\t\t\t'mean': -60\n"
            + "\t\t}\n"
            + "\t];\n";
            if (options.optionsVarName) {
                script += "\t$scope." + options.optionsVarName + " = {\n"
                + "\t\tchart: {\n"
                + "\t\t\ttype: 'cumulativeLineChart',\n"
                + "\t\t\tmargin : {\n"
                + "\t\t\t\ttop: 20,\n"
                + "\t\t\t\tright: 20,\n"
                + "\t\t\t\tbottom: 50,\n"
                + "\t\t\t\tleft: 55\n"
                + "\t\t\t},\n"
                + "\t\t\tx: function(d){ return d[0]; },\n"
                + "\t\t\ty: function(d){ return d[1]/100; },\n"
                + "\t\t\taverage: function(d) { return d.mean/100; },\n"
                + "\t\t\tcolor: d3.scale.category10().range(),\n"
                + "\t\t\tduration: 300,\n"
                + "\t\t\tuseInteractiveGuideline: true,\n"
                + "\t\t\tclipVoronoi: false,\n"
                + "\t\t\tinteractive: true,\n"
                + "\t\t\trescaleY: true,\n"
                + "\t\t\txAxis:       {\n"
                + "\t\t\t\taxisLabel: 'X Axis',\n"
                + "\t\t\t\taxisLabel: 'X Axis',\n"
                + "\t\t\t\ttickFormat: function(d) {\n"
                + "\t\t\t\t\treturn d3.time.format('%m/%d/%y')(new Date(d))\n"
                + "\t\t\t\t},\n"
                + "\t\t\t\tshowMaxMin: false,\n"
                + "\t\t\t\tstaggerLabels: true\n"
                + "\t\t\t},\n"
                + "\t\t\tyAxis:       {\n"
                + "\t\t\t\ttickFormat: function(d){\n"
                + "\t\t\t\t\treturn d3.format(',.1%')(d);\n"
                + "\t\t\t\t},\n"
                + "\t\t\t\taxisLabelDistance: 20\n"
                + "\t\t\t}\n"
                + "\t\t},\n"
                + "\t\ttitle: {\n"
                + "\t\t\ttext: 'Cumulative Line Chart',\n"
                + "\t\t\tenable: true\n"
                + "\t\t}\n"
                + "\t};\n";
            }
        } else if (options.item == 'areachart') {
            script = "$scope." + options.varName + " = [\n"
            + "\t\t{\n"
            + "\t\t\t'key': 'North America',\n"
            + "\t\t\t'values': [ [ 1320033600000 , 26.672] , [ 1322629200000 , 27.297] , [ 1325307600000 , 20.174] , [ 1327986000000 , 19.631] , [ 1330491600000 , 20.366] , [ 1333166400000 , 19.284] , [ 1335758400000 , 19.157]]\n"
            + "\t\t},\n"
            + "\t\t{\n"
            + "\t\t\t'key': 'Europe',\n"
            + "\t\t\t'values': [ [ 1320033600000 , 35.611] , [ 1322629200000 , 35.320] , [ 1325307600000 , 31.564] , [ 1327986000000 , 32.074] , [ 1330491600000 , 35.053] , [ 1333166400000 , 33.873] , [ 1335758400000 , 32.321]]\n"
            + "\t\t},\n"
            + "\t\t{\n"
            + "\t\t\t'key': 'Australia',\n"
            + "\t\t\t'values': [ [ 1320033600000 , 5.453] , [ 1322629200000 , 7.672] , [ 1325307600000 , 8.014] , [ 1327986000000 , 0] , [ 1330491600000 , 0] , [ 1333166400000 , 0] , [ 1335758400000 , 0]]\n"
            + "\t\t}\n"
            + "\t];\n";
            if (options.optionsVarName) {
                script += "\t$scope." + options.optionsVarName + " = {\n"
                + "\t\tchart: {\n"
                + "\t\t\ttype: 'stackedAreaChart',\n"
                + "\t\t\tmargin : {\n"
                + "\t\t\t\ttop: 20,\n"
                + "\t\t\t\tright: 20,\n"
                + "\t\t\t\tbottom: 50,\n"
                + "\t\t\t\tleft: 55\n"
                + "\t\t\t},\n"
                + "\t\t\tx: function(d){return d[0];},\n"
                + "\t\t\ty: function(d){return d[1];},\n"
                + "\t\t\tuseVoronoi: false,\n"
                + "\t\t\tclipEdge: true,\n"
                + "\t\t\tduration: 100,\n"
                + "\t\t\tuseInteractiveGuideline: true,\n"
                + "\t\t\txAxis:       {\n"
                + "\t\t\t\tshowMaxMin: false,\n"
                + "\t\t\t\ttickFormat: function(d) {\n"
                + "\t\t\t\t\treturn d3.time.format('%x')(new Date(d))\n"
                + "\t\t\t\t},\n"
                + "\t\t\t\taxisLabel: 'X Axis'\n"
                + "\t\t\t},\n"
                + "\t\t\tyAxis:       {\n"
                + "\t\t\t\ttickFormat: function(d){\n"
                + "\t\t\t\t\treturn d3.format(',.2f')(d);\n"
                + "\t\t\t\t}\n"
                + "\t\t\t}\n"
                + "\t\t},\n"
                + "\t\ttitle: {\n"
                + "\t\t\ttext: 'Stacked Area Chart',\n"
                + "\t\t\tenable: true\n"
                + "\t\t}\n"
                + "\t};\n";
            }
        } else if (options.item == 'dialog_html') {
            script = "$scope." + options.varName + " = function () {\n"
            + "\t\tvar options = {\n"
            + "\t\t\ttitle : \"This is a title\",\n"
            + "\t\t\thtml : \'Lorem ipsum dolor sit amet, consectetuer adipiscing elit.',\n"
            + "\t\t\tflexWidth : \'30\',\n"
            + "\t\t\theight : \'300px\',\n"
            + "\t\t\tbuttons : [{name : \'OK\', action :\'okButtonAction()\'},{name : \'Cancel\', action : \'cancelButtonAction()\'}],\n"
            + "\t\t\tscope : $scope\n"
            + "\t\t}\n"
            + "\t\t$scope.htmlDialogInstance = dfxDialog.showHTML(options);\n"
            + "\t\t$scope.okButtonAction = function() {\n"
            + "\t\t\t\talert(\'OK\');\n"
            + "\t\t}\n"
            + "\t\t$scope.cancelButtonAction = function() {\n"
            + "\t\t\t\t$scope.htmlDialogInstance.hide();\n"
            + "\t\t}\n"
            + "\t\t}\n";
        }
        else if (options.item == 'dialog_wait') {
                script = "$scope." + options.varName + " = function () {\n"
                + "\t\tvar options = {\n"
                + "\t\t\tflexWidth : \'25\',\n"
                + "\t\t\theight : \'110px\',\n"
                + "\t\t\tmessage : \'Proccessing\',\n"
                + "\t\t\ttype : \'progress\'\n"
                + "\t\t}\n"
                + "\t\t$scope.htmlDialogInstance = dfxDialog.showWaitingMessage(options);\n"
                + "\t\t// use $scope.htmlDialogInstance.hide()\n"
                + "\t\t}\n";
        } else if (options.item == 'dialog_view') {
            script = "$scope." + options.varName + " = function () {\n"
            + "\t\tvar options = {\n"
            + "\t\t\t\ttitle : \"This is a title\",\n"
            + "\t\t\t\tflexWidth : \'30\',\n"
            + "\t\t\t\theight : \'300px\',\n"
            + "\t\t\t\tbuttons : [{name : \'OK\', action :\'okButtonAction()\'},{name : \'Cancel\', action : \'cancelButtonAction()\'}],\n"
            + "\t\t\t\tviewName : '" + options.viewName + "',\n"
            + "\t\t\t\tcardName : '" + options.cardName + "',\n"
            + "\t\t\t\tscope : $scope\n"
            + "\t\t}\n"
            + "\t\t$scope.viewDialogInstance = dfxDialog.showView(options);\n"
            + "\t\t$scope.okButtonAction = function() {\n"
            + "\t\t\t\talert(\'OK\');\n"
            + "\t\t}\n"
            + "\t\t$scope.cancelButtonAction = function() {\n"
            + "\t\t\t\t$scope.viewDialogInstance.hide();\n"
            + "\t\t}\n"
            + "\t\t}\n";
        } else if (options.item == 'side_nav_html') {
            script = "$scope." + options.varName + " = function () {\n"
            + "\t\tvar options = {\n"
            + "\t\t\t\thtml : \'Lorem ipsum dolor sit amet, consectetuer adipiscing elit.',\n"
            + "\t\t\t\twidth : \'400px\',\n"
            + "\t\t\t\tposition : \'left\',\n"
            + "\t\t\t\tscope : $scope\n"
            + "\t\t}\n"
            + "\t\t$scope.sideNavHtmlInstance = dfxSidenav.showHTML(options);\n"
            + "\t\t}\n";
        } else if (options.item == 'side_nav_view') {
            script = "$scope." + options.varName + " = function () {\n"
            + "\t\tvar options = {\n"
            + "\t\t\t\twidth : \'400px\',\n"
            + "\t\t\t\tposition : \'left\',\n"
            + "\t\t\t\tviewName : '" + options.viewName + "',\n"
            + "\t\t\t\tcardName : '" + options.cardName + "',\n"
            + "\t\t\t\tscope : $scope\n"
            + "\t\t}\n"
            + "\t\t$scope.sideNavViewInstance = dfxSidenav.showView(options);\n"
            + "\t\t}\n";
        } else if (options.item == 'bottom_sheet_html') {
            script = "$scope." + options.varName + " = function () {\n"
            + "\t\tvar options = {\n"
            + "\t\t\t\thtml : \'Lorem ipsum dolor sit amet, consectetuer adipiscing elit.',\n"
            + "\t\t\t\tscope : $scope\n"
            + "\t\t}\n"
            + "\t\t$scope.bottomSheetHtmlInstance = dfxBottomSheet.showHTML(options);\n"
            + "\t\t}\n";
        } else if (options.item == 'bottom_sheet_view') {
            script = "$scope." + options.varName + " = function () {\n"
            + "\t\tvar options = {\n"
            + "\t\t\t\tviewName : '" + options.viewName + "',\n"
            + "\t\t\t\tcardName : '" + options.cardName + "',\n"
            + "\t\t\t\tscope : $scope\n"
            + "\t\t}\n"
            + "\t\t$scope.bottomSheetViewInstance = dfxBottomSheet.showView(options);\n"
            + "\t\t}\n";
        } else if (options.item == 'show_card') {
            script = "$scope." + options.varName + " = function () {\n"
            + "\t\tvar options = {\n"
            + "\t\t\t\tviewName : '" + options.viewName + "',\n"
            + "\t\t\t\tcardName : '" + options.cardName + "',\n"
            + "\t\t\t\tscope : $scope\n"
            + "\t\t}\n"
            + "\t\tdfxChangeCard.showCard(options);\n"
            + "\t\t}\n";
        } else if (options.item == 'googleMap') {
            script = "$scope." + options.varName + " = [\n"
            + "\t\t{\n"
            + "\t\t\t'description': '<H1>Paris</H1><p>Capital of France</p>',\n"
            + "\t\t\t'icon': '/assets/hotel_0star.png',\n"
            + "\t\t\t'latitude': '48.856614',\n"
            + "\t\t\t'longitude': '2.352222'\n"
            + "\t\t},\n"
            + "\t\t{\n"
            + "\t\t\t'description': '<H2>London</H2><p>Capital of UK</p>',\n"
            + "\t\t\t'icon': '/assets/hotel_0star.png',\n"
            + "\t\t\t'latitude': '51.507351',\n"
            + "\t\t\t'longitude': '-0.127758'\n"
            + "\t\t},\n"
            + "\t\t{\n"
            + "\t\t\t'description': '<H3>Madrid</H3><p>Capital of Spain</p>',\n"
            + "\t\t\t'icon': '/assets/hotel_0star.png',\n"
            + "\t\t\t'latitude': '40.416775',\n"
            + "\t\t\t'longitude': '-3.703790'\n"
            + "\t\t}\n"
            + "\t];\n";
        }
        editor_script.replaceSelection(script);
        $('#dfx_visual_editor_help_close').click();
    }
};

dfxViewEditorApp.directive('dfxVeCtrlS', [ '$document', function ($document) {
	return {
      restrict: 'A',
      link: function(scope) {
        $document.bind('keydown', function(e) {
			if ((e.which == '115' || e.which == '83' ) && (e.ctrlKey || e.metaKey)) {
				e.preventDefault();
				scope.saveView();
				return false;
		    }
		    return true;
        });
      }
    };
}]);
