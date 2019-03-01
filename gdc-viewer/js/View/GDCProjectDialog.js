define([
    'dojo/_base/declare',
    'dojo/dom-construct',
    'dijit/focus',
    'dijit/form/Button',
    'dijit/form/CheckBox',
    'dijit/layout/TabContainer',
    'dijit/layout/AccordionContainer',
    'dijit/layout/ContentPane',
    'dijit/Tooltip',
    'dijit/Menu',
    'dijit/MenuItem',
    'dijit/form/ComboButton',
    'dojo/aspect',
    'JBrowse/View/Dialog/WithActionBar'
],
function (
    declare,
    dom,
    focus,
    Button,
    CheckBox,
    TabContainer,
    AccordionContainer,
    ContentPane,
    Tooltip,
    Menu,
    MenuItem,
    ComboButton,
    aspect,
    ActionBarDialog
) {
    return declare(ActionBarDialog, {
        
        projectTableHolder: undefined,
        dialogContainer: undefined,
        // GraphQL
        baseGraphQLUrl: 'https://api.gdc.cancer.gov/v0/graphql',

        constructor: function () {
            var thisB = this;

            aspect.after(this, 'hide', function () {
                focus.curNode && focus.curNode.blur();
                setTimeout(function () { thisB.destroyRecursive(); }, 500);
            });
        },
        
        _dialogContent: function () {
            var thisB = this;
            // Container holds all results in the dialog
            thisB.dialogContainer = dom.create('div', { className: 'dialog-container', style: { width: '1200px', height: '700px' } });

            thisB.getProjectInformation();

            thisB.resize();
            return thisB.dialogContainer;
        },

        getProjectInformation: function() {
            var thisB = this;
            var url = thisB.baseGraphQLUrl;

            // Clear current results
            dom.empty(thisB.dialogContainer);
            thisB.createLoadingIcon(thisB.dialogContainer);

            // Create body for GraphQL query
            var projectQuery = `query Projects($size: Int, $offset: Int, $sort: [Sort]) { projectsViewer: viewer { projects { hits(first: $size, offset: $offset, sort: $sort) { total edges { node { id project_id name disease_type program { name } primary_site summary { case_count } } } } } } }`;

            var bodyVal = {
                query: projectQuery,
                variables: {
                    "sort": [{"field": "summary.case_count", "order": "desc"}],
                    "size": 1000,
                    "offset":0
                  }
            }

            fetch(url, {
                method: 'post',
                headers: { 'X-Requested-With': null },
                body: JSON.stringify(bodyVal)
            }).then(function(response) {
                return(response.json());
            }).then(function(response) {
                dom.empty(thisB.dialogContainer);
                thisB.createProjectsTable(response);
            }).catch(function(err) {
                console.log(err);
            });
        },

        /**
         * Creates a table with projects
         * @param {*} response 
         */
        createProjectsTable: function(response) {
            var thisB = this;
            var table = `<table class="results-table"></table>`;
            var tableNode = dom.toDom(table);
            var rowsHolder = `
                <tr>
                    <th>Project</th>
                    <th>Disease Type</th>
                    <th>Primary Site</th>
                    <th>Program</th>
                    <th>Cases</th>
                    <th>Actions</th>
                </tr>
            `;

            var rowsHolderNode = dom.toDom(rowsHolder);

            if (response.data) {
                for (var hitId in response.data.projectsViewer.projects.hits.edges) {
                    var hit = response.data.projectsViewer.projects.hits.edges[hitId].node;

                    var projectRowContent = `
                            <td>${hit.project_id}</td>
                            <td>${hit.disease_type}</td>
                            <td>${hit.primary_site}</td>
                            <td>${hit.program.name}</td>
                            <td>${(hit.summary.case_count).toLocaleString()}</td>
                    `
                    var projectRowContentNode = dom.toDom(projectRowContent);

                    // Create element to hold buttons
                    var projectButtonNode = dom.toDom(`<td></td>`);

                    // Create dropdown button with elements
                    var geneMenu = new Menu({ style: "display: none;"});

                    var menuItemSSM = new MenuItem({
                        label: "SSMs for Project",
                        iconClass: "dijitIconNewTask",
                        onClick: (function(hit) {
                            return function() {
                                thisB.addTrack('SimpleSomaticMutations', hit.project_id, 'CanvasVariants');
                                alert("Adding SSM track for project " + hit.project_id);
                            }
                        })(hit)
                    });
                    geneMenu.addChild(menuItemSSM);

                    var menuItemGene = new MenuItem({
                        label: "Genes for Project",
                        iconClass: "dijitIconNewTask",
                        onClick: (function(hit) {
                            return function() {
                                thisB.addTrack('Genes', hit.project_id, 'CanvasVariants');
                                alert("Adding Gene track for project " + hit.project_id);
                            }
                        })(hit)
                    });
                    geneMenu.addChild(menuItemGene);

                    var menuItemCNV = new MenuItem({
                        label: "CNVs for Project",
                        iconClass: "dijitIconNewTask",
                        onClick: (function(hit) {
                            return function() {
                                thisB.addTrack('CNVs', hit.project_id, 'Wiggle/XYPlot');
                                alert("Adding CNV track for project " + hit.project_id);
                            }
                        })(hit)
                    });
                    geneMenu.addChild(menuItemCNV);

                    geneMenu.startup();

                    var buttonAllGenes = new ComboButton({
                        label: "Add Tracks",
                        iconClass: "dijitIconNewTask",
                        dropDown: geneMenu
                    });
                    buttonAllGenes.placeAt(projectButtonNode);
                    buttonAllGenes.startup();

                    // Add  tooltips
                    thisB.addTooltipToButton(menuItemGene, "Add track with all genes for the given project");
                    thisB.addTooltipToButton(menuItemCNV, "Add track with all CNVs for the given project");
                    thisB.addTooltipToButton(menuItemSSM, "Add track with all SSMs for the given project");

                    // Place buttons in table
                    dom.place(projectButtonNode, projectRowContentNode);

                    var row = `<tr></tr>`;
                    var rowNodeHolder = dom.toDom(row);
                    dom.place(projectRowContentNode, rowNodeHolder);
                    dom.place(rowNodeHolder, rowsHolderNode);

                }
            }
            dom.place(rowsHolderNode, tableNode);
            dom.place(tableNode, thisB.dialogContainer);
        },

        /**
         * Adds a tooltip with some text to a location
         * @param {*} button Location to attach tooltip
         * @param {*} tooltipText Text to display in tooltip
         */
        addTooltipToButton: function(button, tooltipText) {
            var tooltip = new Tooltip({
                label: tooltipText
            });

            tooltip.addTarget(button);
        },

        /**
         * Generic function for adding a track of some type
         * @param {*} storeClass 
         * @param {*} projectId 
         * @param {*} trackType 
         */
        addTrack: function (storeClass, projectId, trackType) {

            var projectFilters = {"op":"in","content":{"field": "cases.project.project_id","value": projectId}};
            
            var storeConf = {
                browser: this.browser,
                refSeq: this.browser.refSeq,
                type: 'gdc-viewer/Store/SeqFeature/' + storeClass,
                project: projectId,
                filters: JSON.stringify(projectFilters)
            };
            var storeName = this.browser.addStoreConfig(null, storeConf);
            var randomId = Math.random().toString(36).substring(7);

            var key = 'GDC_' + storeClass;
            var label = key + '_' + randomId;

            key += '_' + projectId
            label += '_' + projectId

            var trackConf = {
                type: 'JBrowse/View/Track/' + trackType,
                store: storeName,
                label: label,
                key: key,
                metadata: {
                    datatype: storeClass,
                    project: projectId
                }
            };

            if (storeClass === 'CNVs') {
                trackConf.autoscale = 'local';
                trackConf.bicolor_pivot = 0;
            }

            console.log("Adding track of type " + trackType + " and store class " + storeClass + ": " + key + " (" + label + ")");

            trackConf.store = storeName;
            this.browser.publish('/jbrowse/v1/v/tracks/new', [trackConf]);
            this.browser.publish('/jbrowse/v1/v/tracks/show', [trackConf]);
        },

        /**
         * Creates a loading icon in the given location and returns
         * @param {object} location Place to put the loading icon
         */
        createLoadingIcon: function (location) {
            var loadingIcon = dom.create('div', { className: 'loading-gdc' }, location);
            var spinner = dom.create('div', {}, loadingIcon);
            return loadingIcon;
        },

        /**
         * Generate a GUID
         */
        guid: function() {
            function s4() {
              return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
            }
            return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
        },

        show: function (browser, callback) {
            this.browser = browser;
            this.callback = callback || function () {};
            this.set('title', 'GDC Browser');
            this.set('content', this._dialogContent());
            this.inherited(arguments);
            focus.focus(this.closeButtonNode);
        }
        
    });
});