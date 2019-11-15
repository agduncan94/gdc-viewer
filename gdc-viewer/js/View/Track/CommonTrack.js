/**
 * Base class for GDC tracks with clickable features
 */
define(
    [
        "dojo/_base/declare",
        'dojo/dom-construct',
        'dijit/form/Button',
        'dijit/form/NumberSpinner',
        'dijit/form/ValidationTextBox',
        './ValidationTextArea'
    ],
   function(
       declare,
       domConstruct,
       Button,
       NumberSpinner,
       ValidationTextBox,
       ValidationTextArea) {
   return declare(null, {

    _trackMenuOptions: function () {
        var options = this.inherited(arguments);
        options.push({ type: 'dijit/MenuSeparator' } );
        options.push({
            label: 'Share Track as URL',
            action: "contentDialog",
            title: 'Share Track as URL',
            content: dojo.hitch(this,'_shareableLinkContent')
        });
        options.push({
            label: 'View Applied Filters',
            action: "contentDialog",
            title: 'View Applied Filters',
            content: dojo.hitch(this,'_appliedFilters')
        });
        return options;
    },

    /**
     * Create dialog showing applied filters for the given track.
     * User can apply new filters here too.
     */
    _appliedFilters: function() {
        var track = this;
        var details = domConstruct.create('div', { className: 'detail', style: 'display: flex; flex-direction: column; align-items: center; justify-content: center;' });
        
        var headerString = '<h1 style="width: 80%">Track Filters</h1>';
        var headerElement = domConstruct.toDom(headerString);
        domConstruct.place(headerElement, details);

        // Create help text
        var helpString = '<span style="width: 80%">The following filters have been applied to the track. You can update the filters here, though no validation is done on the input.</span>';
        var helpElement = domConstruct.toDom(helpString);
        domConstruct.place(helpElement, details);

        var filterString = '<div style="width: 80%"><h3>Filters</h3></div>';
        var filterElement = domConstruct.toDom(filterString);
        domConstruct.place(filterElement, details);

        // Get filtered text
        var filteredText = JSON.stringify(track.store.filters, null, 2)

        var textArea = new ValidationTextArea({
            rows: 20,
            value: filteredText,
            style: "width: 80%",
            readOnly: false,
            id: "filterTextArea",
            invalidMessage: "Invalid JSON filter - must be a valid JSON",
            isValid: function() {
                var value = this.attr('value')
                try {
                  JSON.parse(value)
                } catch (e) {
                    return false;
                }
                return true;
              }
        }).placeAt(details);

        var caseString = '<div style="width: 80%"><h3>Case UUID</h3></div>';
        var caseElement = domConstruct.toDom(caseString);
        domConstruct.place(caseElement, details);

        var caseIdTextBox = new ValidationTextBox({
            value: track.store.config.case,
            style: "width: 80%",
            id: "caseTextBox",
            regExp: "^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$",
            invalidMessage: "Invalid Case UUID - Must be version 4 UUID",
            trim: true
        }).placeAt(details);

        var sizeHeader = '<div style="width: 80%"><h3>Size</h3></div>';
        var sizeElement = domConstruct.toDom(sizeHeader);
        domConstruct.place(sizeElement, details);

        var sizeTextBox = new NumberSpinner({
            value: track.store.size,
            style: "width: 80%",
            id: "sizeTextBox",
            constraints: { min: 1, max: 1000, places: 0 },
            smallDelta: 10
        }).placeAt(details);

        var updateTrackButton = new Button({
            label: 'Apply New Filters',
            iconClass: 'dijitIconSave',
            onClick: function() {
                const trackString = document.getElementById("filterTextArea").value;
                const caseString = document.getElementById("caseTextBox").value;
                const sizeString = document.getElementById("sizeTextBox").value;
                var storeConf = {
                    browser: track.browser,
                    refSeq: track.browser.refSeq,
                    type: track.store.config.type,
                    case: caseString,
                    size: sizeString,
                    filters: trackString
                };
                var storeName = track.browser.addStoreConfig(null, storeConf);
                track.config.store = storeName;
                track.browser.publish( '/jbrowse/v1/v/tracks/replace', [track.config] );
            }
        }).placeAt(details);

        caseIdTextBox.on('change', function(e) {
            updateTrackButton.set('disabled', !caseIdTextBox.validate() || !sizeTextBox.validate() || !textArea.validate())
        });

        sizeTextBox.on('change', function(e) {
            updateTrackButton.set('disabled', !caseIdTextBox.validate() || !sizeTextBox.validate() || !textArea.validate())
        });

        textArea.on('change', function(e) {
            updateTrackButton.set('disabled', !caseIdTextBox.validate() || !sizeTextBox.validate() || !textArea.validate())
        });

        return details;
    },

    /**
     * Create a dialog with a shareable link to the current track.
     */
    _shareableLinkContent: function() {
        var track = this;
        var details = domConstruct.create('div', { className: 'detail', style: 'display: flex; flex-direction: column; align-items: center; justify-content: center;' });
        
        var headerString = '<h1 style="width: 80%">Shareable Link</h1>';
        var headerElement = domConstruct.toDom(headerString);
        domConstruct.place(headerElement, details);

        // Create addTracks value
        var addTracksArray = [];
        var addTrackConf = {};
        addTrackConf.label = track.config.label;
        addTrackConf.storeClass = track.store.config.type;
        addTrackConf.type = track.config.type;
        addTrackConf.key = track.config.key;
        addTrackConf.metadata = track.config.metadata;
        addTrackConf.filters = track.store.config.filters;
        addTrackConf.case = track.store.config.case;
        addTrackConf.size = track.config.size;
        addTracksArray.push(addTrackConf);
        addTracksArray = JSON.stringify(addTracksArray); 

        // Create a shareable URL
        var params = new URLSearchParams(window.location.search);
        params.set("addTracks", addTracksArray);
        var shareableLink = window.location.protocol + "//" + window.location.host + window.location.pathname + '?' + params.toString();

        // Create help text
        var helpString = '<span style="width: 80%">Use the following link to share the selected track at the current location.</span>';
        var helpElement = domConstruct.toDom(helpString);
        domConstruct.place(helpElement, details);

        // Create text area with shareable link
        var textArea = domConstruct.create(
            'textarea',{
                rows: 10,
                value: shareableLink,
                style: "width: 80%",
                readOnly: true
            }, details );

        // Create a DOM element for the link
        var linkString = '<a target="_blank" href="' + shareableLink + '">Open in New Tab</a>';
        var linkElement = domConstruct.toDom(linkString);
        domConstruct.place(linkElement, details);

        return details;
    }
   }); 
   }   
);