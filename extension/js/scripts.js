var Winston = function () {
    this.appComponent = React.createElement(App, null);
    this.registeredPackages = {};
    this.bootedPackages = {};

    React.render(this.appComponent, document.body);
};

(function () {
    var Package = function () {

    };

    Package.prototype.inputHandler = function (e) {

    };

    Package.prototype.indexHandler = function () {

    };

    Package.registeredPackages = {};
    
    Package.register = function (name, constructor) {
        return Package.registeredPackages[name] = constructor;
    };

    Package.enabledPackages = {};

    Package.enable = function (name, searchInput) {
        var packages = Package.registeredPackages;
        return Package.enabledPackages[name] = new packages[name](searchInput);
    };

    Package.disable = function (name, searchInput) {
        var packages = Package.enabledPackages;
        delete packages[name];
    };

    Winston.Package = Package;
})(Winston);

(function (Winston) {
    var Core = function () {};

    Core.prototype.inputHandler = function (e) {
        var input = e.target.value;
        var inputWords = input.trim().split(' ');
        var commands = [];

        if (input.length > 0) {
            // help command
            if ('help'.indexOf(input) === 0) {
                commands.push({
                    id: 'COREHELP',
                    icon: 'question',
                    title: 'Help',
                    description: 'Open help file for Winston',
                    action: 'Get Help',
                    run: function () {
                        chrome.tabs.create({ url: 'https://github.com/johnnyfreeman/winston/blob/master/README.md#usage' });
                    }
                });
            }

            // settings command
            if ('settings'.indexOf(input) === 0) {
                commands.push({
                    id: 'COREOPTIONS',
                    icon: 'cogs',
                    title: 'Settings',
                    description: 'Open Winston settings',
                    action: 'Open Settings',
                    run: function () {
                        var extId = chrome.runtime.id;
                        chrome.tabs.create({ url: 'chrome://extensions?options=' + extId });
                    }
                });
            }

            // enable package command
            if (inputWords.length === 1 && 'enable'.indexOf(inputWords[0].toLowerCase()) === 0) {
                Object.keys(Winston.Package.registeredPackages).forEach(function (name) {
                    commands.push(new EnablePackage(name));
                });
            } else if (inputWords.length > 1 && 'enable'.indexOf(inputWords[0].toLowerCase()) === 0) {
                Object.keys(Winston.Package.registeredPackages).forEach(function (name) {
                    if (name.toLowerCase().indexOf(inputWords[1].toLowerCase()) > -1) {
                        commands.push(new EnablePackage(name));
                    }
                });
            }


            // disable package command
            if (inputWords.length === 1 && 'disable'.indexOf(inputWords[0].toLowerCase()) === 0) {
                Object.keys(Winston.Package.registeredPackages).forEach(function (name) {
                    commands.push(new DisablePackage(name));
                });
            } else if (inputWords.length > 1 && 'disable'.indexOf(inputWords[0].toLowerCase()) === 0) {
                Object.keys(Winston.Package.registeredPackages).forEach(function (name) {
                    if (name.toLowerCase().indexOf(inputWords[1].toLowerCase()) > -1) {
                        commands.push(new DisablePackage(name));
                    }
                });
            }

            // for debugging purposes
            if ('debug'.indexOf(input) > -1) {
                commands.push({
                    id: 'COREDEBUG',
                    icon: 'bug',
                    title: 'Debug',
                    description: 'Open Winston in it\'s own tab for debugging',
                    action: 'Get Help',
                    run: function () {
                        var extId = chrome.runtime.id;
                        chrome.tabs.create({ url: 'chrome-extension://' + extId + '/popup.html' });
                    }
                });
            }
        }

        return commands;
    };

    var EnablePackage = function (packageName) {
        this.packageName = packageName;
        this.id = 'COREENABLE-' + packageName;
        this.icon = 'toggle-on';
        this.title = 'Enable ' + packageName;
        this.description = 'Turn on ' + packageName + ' package';
        this.action = 'Enable Package';
    };

    EnablePackage.prototype.run = function () {
        Winston.Package.enable(this.packageName);
    };

    var DisablePackage = function (packageName) {
        this.packageName = packageName;
        this.id = 'COREENABLE-' + packageName;
        this.icon = 'toggle-off';
        this.title = 'Disable ' + packageName;
        this.description = 'Turn on ' + packageName + ' package';
        this.action = 'Disable Package';
    };

    DisablePackage.prototype.run = function () {
        Winston.Package.disable(this.packageName);
    };

    Winston.Package.register('Core', Core);
    Winston.Package.enable('Core');
})(Winston);

(function (Winston) {
    var Bookmarks = function () {};

    Bookmarks.prototype.inputHandler = function (e) {
        var input = e.target.value;
        var commands = [];

        // create command
        var cmd = new CreateBookmarkCommand();
        var title = cmd.title.toLowerCase();
        if (input.length > 0 && title.indexOf(input.toLowerCase()) == 0) {
            commands.push(cmd);
        }

        return new Promise(function (resolve, reject) {
            chrome.bookmarks.search(input, function (bookmarks) {
                bookmarks.forEach(function (bookmark, i) {
                    commands.push(new BookmarkCommand(bookmark, i));
                });

                resolve(commands);
            });
        });
    };

    var BookmarkCommand = function (bookmark, i) {
        this.id = 'BOOKMARK' + i;
        this.icon = 'star-o';
        this.title = bookmark.title;
        this.url = bookmark.url;
        this.description = this.url;
        this.action = 'Open Bookmark';
    };

    BookmarkCommand.prototype.run = function () {
        chrome.tabs.create({ url: this.url });
    };

    var CreateBookmarkCommand = function () {
        this.icon = 'star-o';
        this.title = 'Bookmark This Page';
        this.description = 'Create a bookmark for the active tab';
        this.action = 'Create Bookmark';
    };

    CreateBookmarkCommand.prototype.run = function () {
        chrome.tabs.query({currentWindow: true, active: true}, function (tabs) {
            chrome.bookmarks.create({
                title: tabs[0].title,
                url: tabs[0].url
            }, function () {
                // close the extension
                window.close();
            });
        });
    };

    Winston.Package.register('Bookmarks', Bookmarks);
})(Winston);

(function (Winston) {
    var History = function () {
        var history = this;
        this.items = [];

        chrome.history.search({text: ''}, function (historyItems) {
            history.items = historyItems;
        });
    };

    History.prototype.inputHandler = function (e) {
        var input = e.target.value;
        var commands = [];

        if (input.length > 0) {
            this.items.forEach(function (item, i) {
                if (item.title.indexOf(input) > -1) {
                    commands.push(new HistoryCommand(item, i));
                }
            });
        }

        return commands;
    };

    var HistoryCommand = function (history, i) {
        this.id = 'HISTORY' + i;
        this.icon = 'history';
        this.title = history.title || history.url;
        this.url = history.url;
        this.description = this.url;
        this.action = 'Open History';
    };

    HistoryCommand.prototype.run = function () {
        chrome.tabs.create({ url: this.url });
    };

    Winston.Package.register('History', History);
})(Winston);

(function (Winston) {

    var Tabs = function () {};

    Tabs.prototype.inputHandler = function (e) {
        var input = e.target.value;
        var commands = [];

        var cmds = [
            new TabDuplicateCommand(),
            new TabCloseCommand(),
            new TabReloadCommand(),
            new TabNewCommand(),
            new TabPinCommand()
        ];

        cmds.forEach(function (cmd) {
            var title = cmd.title.toLowerCase();
            if (input.length > 0 && title.indexOf(input.toLowerCase()) == 0) {
                commands.push(cmd);
            }
        });

        return new Promise(function (resolve, reject) {
            if (input.length > 0) {
                chrome.tabs.query({}, function (tabs) {
                    tabs.forEach(function (tab, i) {
                        if (tab.title.toLowerCase().indexOf(input.toLowerCase()) > -1) {
                            commands.push(new TabSearchCommand(tab, i));
                        }
                    });

                    resolve(commands);
                });
            } else {
                resolve(commands);
            }
        });
    };

    var TabSearchCommand = function (tab, i) {
        this.id = 'TABSEARCH' + i;
        this.icon = 'folder-o';
        this.action = 'Switch To Tab'
        this.tab = tab;
        this.title = this.tab.title;
        this.description = this.tab.url;
    };

    TabSearchCommand.prototype.run = function () {
        chrome.tabs.update(this.tab.id, {
            active: true
        });
    };

    var TabDuplicateCommand = function () {
        this.id = 'TABDUPLICATE';
        this.icon = 'folder-o';
        this.action = 'Duplicate Tab'
        this.title = 'Duplicate This Tab';
        this.description = 'Duplicate the current tab';
    };

    TabDuplicateCommand.prototype.run = function () {
        chrome.tabs.query({active:true}, function (tabs) {
            chrome.tabs.duplicate(tabs[0].id);
        });
    };

    var TabCloseCommand = function () {
        this.id = 'TABCLOSE';
        this.icon = 'folder-o';
        this.action = 'Close Tab'
        this.title = 'Close This Tab';
        this.description = 'Close the current tab';
    };

    TabCloseCommand.prototype.run = function () {
        chrome.tabs.query({active:true}, function (tabs) {
            chrome.tabs.remove(tabs[0].id);
        });
    };

    var TabReloadCommand = function () {
        this.id = 'TABRELOAD';
        this.icon = 'folder-o';
        this.action = 'Reload Tab'
        this.title = 'Reload This Tab';
        this.description = 'Reload the current tab';
    };

    TabReloadCommand.prototype.run = function () {
        chrome.tabs.query({active:true}, function (tabs) {
            chrome.tabs.reload(tabs[0].id, function () {
                window.close();
            });
        });
    };

    var TabNewCommand = function () {
        this.id = 'TABNEW';
        this.icon = 'folder-o';
        this.action = 'New Tab'
        this.title = 'New Tab';
        this.description = 'Create new tab';
    };

    TabNewCommand.prototype.run = function () {
        chrome.tabs.create({});
    };

    var TabPinCommand = function () {
        this.id = 'TABPIN';
        this.icon = 'folder-o';
        this.action = 'Pin Tab'
        this.title = 'Pin This Tab';
        this.description = 'Pin the current tab';
    };

    TabPinCommand.prototype.run = function () {
        chrome.tabs.query({active:true}, function (tabs) {
            chrome.tabs.update(tabs[0].id, { pinned: true }, function () {
                window.close();
            });
        });
    };

    Winston.Package.register('Tabs', Tabs);
})(Winston);

(function (Winston) {
    var Calculator = function () {};

    Calculator.prototype.inputHandler = function (e) {
        var commands = [];
        var input = e.target.value;
        var result;

        try {
            result = math.format(math.eval(input), 2);
            if (result !== 'undefined' && result !== 'function') {
                commands.push({
                    id: 'CALCULATOR1',
                    title: result,
                    description: "Copy '" + result + "' to your clipboard",
                    action: 'Copy To Clipboard',
                    icon: 'calculator',
                    run: function () {
                        document.execCommand('copy');
                    }
                });
            }
        } catch(e) {}

        return commands;
    };

    Winston.Package.register('Calculator', Calculator);
})(Winston);

(function (Winston) {
    var Youtube = function () {
        // hard keywords are stripped from the query
        this.hardKeywords = ['video', 'youtube'];
        this.softKeywords = ['cover', 'movie', 'music', 'trailer', 'tutorial', 'how'];
    };

    Youtube.prototype.inputHandler = function (e) {
        var input = e.target.value;
        var commands = [];
        var youtube = this;

        if (input.length > 0) {
            this.hardKeywords.concat(this.softKeywords).forEach(function (keyword, keywordIndex) {
                var inputWords = input.trim().split(' ');
                var query = input;

                inputWords.forEach(function (inputWord, inputWordIndex) {
                    var matchesKeyword = keyword.indexOf(inputWord) === 0;

                    // continue to next inputWord if this doesn't match the current keyword
                    if (!matchesKeyword) return;

                    // remove hard keywords
                    if (youtube.hardKeywords.indexOf(keyword) > -1) {
                        query = query.replace(inputWord, '').trim();
                    }

                    // replace soft keywords
                    query = query.replace(inputWord, keyword);

                    if (query.length > 0) {
                        commands.push(new YoutubeSearchCommand(query, keywordIndex.toString() + inputWordIndex.toString()));
                    } else {
                        commands.push(new YoutubeHomeCommand());
                    }
                });
            });
        }

        return commands;
    };

    var YoutubeHomeCommand = function () {
        this.id = 'YOUTUBEHOME';
        this.icon = 'youtube';
        this.action = 'Open Site';
        this.title = 'YouTube.com';
        this.description = 'YouTube: Open YouTube.com';
    };

    YoutubeHomeCommand.prototype.run = function () {
        chrome.tabs.create({ url: 'https://www.youtube.com/' });
    };

    var YoutubeSearchCommand = function (query, i) {
        this.id = 'YOUTUBE' + i;
        this.query = query;
        this.icon = 'youtube';
        this.action = 'Search YouTube';
        this.title = 'YouTube "' + this.query + '"';
        this.description = 'YouTube: Open YouTube search results';
    };

    YoutubeSearchCommand.prototype.run = function () {
        chrome.tabs.create({ url: 'https://www.youtube.com/results?search_query=' + encodeURIComponent(this.query) });
    };
    Winston.Package.register('YouTube', Youtube);
})(Winston);

(function (Winston) {
    var Pinterest = function () {
        var pinterest = this;

        chrome.tabs.query({currentWindow: true, active: true}, function(tabs){
            pinterest.url = tabs[0].url;
        });
    };

    Pinterest.prototype.inputHandler = function (e) {
        var commands = [];
        var input = e.target.value;

        if (input.indexOf('pin') === 0) {
            commands.push({
                url: this.url,
                title: "Pin this page",
                description: this.url,
                action: 'Pin Page',
                icon: 'pinterest',
                run: function () {
                    chrome.tabs.create({
                        url: 'https://www.pinterest.com/pin/create/button/?url=' + this.url
                    });
                }
            });
        }

        return commands;
    };

    Winston.Package.register('Pinterest', Pinterest);
})(Winston);

(function (Winston) {

    var Salesforce = function () {

        // this.hardKeywords = ['sf'];
        // this.softKeywords = ['apex', 'system'];
        jsforce.browser.init({
          clientId: '3MVG9xOCXq4ID1uGbuCfSNW3olnFLJL8Sf2xPkbsYsYqPJrvDAoOE5U_CjIjP3Wv9wsALOpqX9nTPRmcQtPIi',
          redirectUri: 'https://login.salesforce.com/services/oauth2/success'
        });

        jsforce.browser.on('connect', function(conn) {
          conn.query('SELECT Id, Name FROM Account', function(err, res) {
            if (err) { return console.error(err); }
            console.log(res);
          });
        });

        // jsforce.browser.login();

        // documentation links
        // docLinks[input] = url
        this.docLinks = {};

        this.docLinks['apex:actionFunction'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_actionFunction.htm';
        this.docLinks['apex:actionPoller'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_actionPoller.htm';
        this.docLinks['apex:actionRegion'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_actionRegion.htm';
        this.docLinks['apex:actionStatus'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_actionStatus.htm';
        this.docLinks['apex:actionSupport'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_actionSupport.htm';
        this.docLinks['apex:areaSeries'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_areaSeries.htm';
        this.docLinks['apex:attribute'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_attribute.htm';
        this.docLinks['apex:axis'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_axis.htm';
        this.docLinks['apex:barSeries'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_barSeries.htm';
        this.docLinks['apex:canvasApp'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_canvasApp.htm';
        this.docLinks['apex:chart'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_chart.htm';
        this.docLinks['apex:chartLabel'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_chartLabel.htm';
        this.docLinks['apex:chartTips'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_chartTips.htm';
        this.docLinks['apex:column'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_column.htm';
        this.docLinks['apex:commandButton'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_commandButton.htm';
        this.docLinks['apex:commandLink'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_commandLink.htm';
        this.docLinks['apex:component'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_component.htm';
        this.docLinks['apex:componentBody'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_componentBody.htm';
        this.docLinks['apex:composition'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_composition.htm';
        this.docLinks['apex:dataList'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_dataList.htm';
        this.docLinks['apex:dataTable'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_dataTable.htm';
        this.docLinks['apex:define'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_define.htm';
        this.docLinks['apex:detail'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_detail.htm';
        this.docLinks['apex:dynamicComponent'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_dynamicComponent.htm';
        this.docLinks['apex:emailPublisher'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_emailPublisher.htm';
        this.docLinks['apex:enhancedList'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_enhancedList.htm';
        this.docLinks['apex:facet'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_facet.htm';
        this.docLinks['apex:flash'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_flash.htm';
        this.docLinks['apex:form'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_form.htm';
        this.docLinks['apex:gaugeSeries'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_gaugeSeries.htm';
        this.docLinks['apex:iframe'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_iframe.htm';
        this.docLinks['apex:image'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_image.htm';
        this.docLinks['apex:include'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_include.htm';
        this.docLinks['apex:includeScript'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_includeScript.htm';
        this.docLinks['apex:inlineEditSupport'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_inlineEditSupport.htm';
        this.docLinks['apex:input'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_input.htm';
        this.docLinks['apex:inputCheckbox'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_inputCheckbox.htm';
        this.docLinks['apex:inputField'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_inputField.htm';
        this.docLinks['apex:inputFile'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_inputFile.htm';
        this.docLinks['apex:inputHidden'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_inputHidden.htm';
        this.docLinks['apex:inputSecret'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_inputSecret.htm';
        this.docLinks['apex:inputText'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_inputText.htm';
        this.docLinks['apex:inputTextarea'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_inputTextarea.htm';
        this.docLinks['apex:insert'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_insert.htm';
        this.docLinks['apex:legend'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_legend.htm';
        this.docLinks['apex:lineSeries'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_lineSeries.htm';
        this.docLinks['apex:listViews'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_listViews.htm';
        this.docLinks['apex:logCallPublisher'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_logCallPublisher.htm';
        this.docLinks['apex:map'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_map.htm';
        this.docLinks['apex:mapMarker'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_mapMarker.htm';
        this.docLinks['apex:message'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_message.htm';
        this.docLinks['apex:messages'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_messages.htm';
        this.docLinks['apex:milestoneTracker'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_milestoneTracker.htm';
        this.docLinks['apex:outputField'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_outputField.htm';
        this.docLinks['apex:outputLabel'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_outputLabel.htm';
        this.docLinks['apex:outputLink'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_outputLink.htm';
        this.docLinks['apex:outputPanel'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_outputPanel.htm';
        this.docLinks['apex:outputText'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_outputText.htm';
        this.docLinks['apex:page'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_page.htm';
        this.docLinks['apex:pageBlock'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_pageBlock.htm';
        this.docLinks['apex:pageBlockButtons'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_pageBlockButtons.htm';
        this.docLinks['apex:pageBlockSection'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_pageBlockSection.htm';
        this.docLinks['apex:pageBlockSectionItem'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_pageBlockSectionItem.htm';
        this.docLinks['apex:pageBlockTable'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_pageBlockTable.htm';
        this.docLinks['apex:pageMessage'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_pageMessage.htm';
        this.docLinks['apex:pageMessages'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_pageMessages.htm';
        this.docLinks['apex:panelBar'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_panelBar.htm';
        this.docLinks['apex:panelBarItem'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_panelBarItem.htm';
        this.docLinks['apex:panelGrid'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_panelGrid.htm';
        this.docLinks['apex:panelGroup'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_panelGroup.htm';
        this.docLinks['apex:param'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_param.htm';
        this.docLinks['apex:pieSeries'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_pieSeries.htm';
        this.docLinks['apex:radarSeries'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_radarSeries.htm';
        this.docLinks['apex:relatedList'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_relatedList.htm';
        this.docLinks['apex:remoteObjectField'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_remoteObjectField.htm';
        this.docLinks['apex:remoteObjectModel'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_remoteObjectModel.htm';
        this.docLinks['apex:remoteObjects'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_remoteObjects.htm';
        this.docLinks['apex:repeat'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_repeat.htm';
        this.docLinks['apex:scatterSeries'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_scatterSeries.htm';
        this.docLinks['apex:scontrol'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_scontrol.htm';
        this.docLinks['apex:sectionHeader'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_sectionHeader.htm';
        this.docLinks['apex:selectCheckboxes'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_selectCheckboxes.htm';
        this.docLinks['apex:selectList'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_selectList.htm';
        this.docLinks['apex:selectOption'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_selectOption.htm';
        this.docLinks['apex:selectOptions'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_selectOptions.htm';
        this.docLinks['apex:selectRadio'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_selectRadio.htm';
        this.docLinks['apex:stylesheet'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_stylesheet.htm';
        this.docLinks['apex:tab'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_tab.htm';
        this.docLinks['apex:tabPanel'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_tabPanel.htm';
        this.docLinks['apex:toolbar'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_toolbar.htm';
        this.docLinks['apex:toolbarGroup'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_toolbarGroup.htm';
        this.docLinks['apex:variable'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_variable.htm';
        this.docLinks['apex:vote'] = 'http://www.salesforce.com/docs/developer/pages/Content/pages_compref_vote.htm';

        this.docLinks['FeedItem'] = 'https://www.salesforce.com/developer/docs/api/Content/sforce_api_objects_feeditem.htm';
        this.docLinks['FeedPost'] = 'https://www.salesforce.com/developer/docs/api/Content/sforce_api_objects_feedpost.htm';

        // system namespace
        this.docLinks['Address Class'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_class_system_Address.htm';
        this.docLinks['Answers Class'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_class_system_Answers.htm';
        this.docLinks['ApexPages Class'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_methods_system_ApexPages.htm';
        this.docLinks['Approval Class'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_methods_system_Approval.htm';
        this.docLinks['Blob Class'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_methods_system_Blob.htm';
        this.docLinks['Boolean Class'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_methods_system_Boolean.htm';
        this.docLinks['BusinessHours Class'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_class_system_BusinessHours.htm';
        this.docLinks['Cases Class'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_class_system_Cases.htm';
        this.docLinks['Comparable Interface'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_comparable.htm';
        this.docLinks['Continuation Class'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_class_System_Continuation.htm';
        this.docLinks['Cookie Class'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_classes_sites_cookie.htm';
        this.docLinks['Crypto Class'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_classes_restful_crypto.htm';
        this.docLinks['Custom Settings Methods'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_methods_system_custom_settings.htm';
        this.docLinks['Database Class'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_methods_system_Database.htm';
        this.docLinks['Date Class'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_methods_system_Date.htm';
        this.docLinks['Datetime Class'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_methods_system_Datetime.htm';
        this.docLinks['Decimal Class'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_methods_system_Decimal.htm';
        this.docLinks['Double Class'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_methods_system_Double.htm';
        this.docLinks['EncodingUtil Class'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_classes_restful_encodingUtil.htm';
        this.docLinks['Enum Methods'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_methods_system_enum.htm';
        this.docLinks['Exception and Built-In Exceptions Class'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_classes_exception_methods.htm';
        this.docLinks['Http Class'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_classes_restful_http_http.htm';
        this.docLinks['HttpCalloutMock Interface'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_interface_httpcalloutmock.htm';
        this.docLinks['HttpRequest Class'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_classes_restful_http_httprequest.htm';
        this.docLinks['HttpResponse Class'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_classes_restful_http_httpresponse.htm';
        this.docLinks['Id Class'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_methods_system_Id.htm';
        this.docLinks['Ideas Class'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_classes_ideas.htm';
        this.docLinks['InstallHandler Interface'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_install_handler.htm';
        this.docLinks['Integer Class'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_methods_system_Integer.htm';
        this.docLinks['JSON Class'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_class_System_JSON.htm';
        this.docLinks['JSONGenerator Class'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_class_System_JSONGenerator.htm';
        this.docLinks['JSONParser Class'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_class_System_JSONParser.htm';
        this.docLinks['JSONToken Enum'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_enum_System_JsonToken.htm';
        this.docLinks['Limits Class'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_methods_system_Limits.htm';
        this.docLinks['List Class'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_methods_system_List.htm';
        this.docLinks['Location Class'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_class_system_Location.htm';
        this.docLinks['Long Class'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_methods_system_Long.htm';
        this.docLinks['Map Class'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_methods_system_Map.htm';
        this.docLinks['Matcher Class'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_classes_pattern_and_matcher_matcher_methods.htm';
        this.docLinks['Math Class'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_methods_system_Math.htm';
        this.docLinks['Messaging Class'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_classes_email_outbound_messaging.htm';
        this.docLinks['MultiStaticResourceCalloutMock Class'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_methods_system_MultiStaticResourceCalloutMock.htm';
        this.docLinks['Network Class'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_classes_Network.htm';
        this.docLinks['PageReference Class'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_system_PageReference.htm';
        this.docLinks['Pattern Class'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_classes_pattern_and_matcher_pattern_methods.htm';
        this.docLinks['Queueable Interface'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_class_System_Queueable.htm';
        this.docLinks['QueueableContext Interface'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_interface_system_queueablecontext.htm';
        this.docLinks['QuickAction Class'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_class_system_quickaction.htm';
        this.docLinks['RemoteObjectController'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_class_system_remoteobjectcontroller.htm';
        this.docLinks['ResetPasswordResult Class'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_class_System_ResetPasswordResult.htm';
        this.docLinks['RestContext Class'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_methods_system_RestContext.htm';
        this.docLinks['RestRequest Class'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_methods_system_RestRequest.htm';
        this.docLinks['RestResponse Class'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_methods_system_RestResponse.htm';
        this.docLinks['Schedulable Interface'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_interface_system_schedulable.htm';
        this.docLinks['SchedulableContext Interface'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_interface_system_schedulablecontext.htm';
        this.docLinks['Schema Class'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_methods_system_Schema.htm';
        this.docLinks['Search Class'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_methods_system_Search.htm';
        this.docLinks['SelectOption Class'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_pages_selectoption.htm';
        this.docLinks['Set Class'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_methods_system_Set.htm';
        this.docLinks['Site Class'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_classes_sites.htm';
        this.docLinks['sObject Class'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_methods_system_sObject.htm';
        this.docLinks['StaticResourceCalloutMock Class'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_methods_system_StaticResourceCalloutMock.htm';
        this.docLinks['String Class'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_methods_system_String.htm';
        this.docLinks['System Class'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_methods_system_System.htm';
        this.docLinks['Test Class'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_methods_system_Test.htm';
        this.docLinks['Time Class'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_methods_system_Time.htm';
        this.docLinks['TimeZone Class'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_methods_system_TimeZone.htm';
        this.docLinks['Trigger Class'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_class_System_Trigger.htm';
        this.docLinks['Type Class'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_methods_system_Type.htm';
        this.docLinks['UninstallHandler Interface'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_uninstall_handler.htm';
        this.docLinks['URL Class'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_methods_system_URL.htm';
        this.docLinks['UserInfo Class'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_methods_system_UserInfo.htm';
        this.docLinks['Version Class'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_methods_system_Version.htm';
        this.docLinks['WebServiceCallout Class'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_class_System_WebServiceCallout.htm';
        this.docLinks['WebServiceMock Interface'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_interface_webservicemock.htm';
        this.docLinks['XmlStreamReader Class'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_classes_xml_XmlStream_reader.htm';
        this.docLinks['XmlStreamWriter Class'] = 'https://www.salesforce.com/us/developer/docs/apexcode/Content/apex_classes_xml_XmlStream_writer.htm';
    };

    Salesforce.prototype.inputHandler = function (e) {
        var input = e.target.value;
        var commands = [];
        var sf = this;
        Object.keys(this.docLinks).forEach(function (key) {
            if (input.length > 0 && key.toLowerCase().indexOf(input.toLowerCase()) > -1) {
                commands.push(new SalesforceDocCommand(key, sf.docLinks[key]));
            }
        });

        return commands;
    };

    var SalesforceDocCommand = function (title, url) {
        this.id = 'SFDOC-' + title.replace(' ', '-');
        this.icon = 'cloud';
        this.action = 'Open Documentation';
        this.title = title;
        this.url = url;
        this.description = 'Open Salesforce documentation';
    };

    SalesforceDocCommand.prototype.run = function () {
        chrome.tabs.create({ url: this.url });
    };

    Winston.Package.register('Salesforce', Salesforce);
})(Winston);

(function (Winston) {
    var Google = function () {};

    Google.prototype.inputHandler = function (e) {
        var input = e.target.value;
        var commands = [];
        
        if (input.length > 0) {
            commands.push(new GoogleSearchCommand(input));
            commands.push(new GoogleLuckyCommand(input));
        }

        return commands;

        // fuzzy search commands
        // var f = new Fuse(commands, { keys: ['title'] });
        // var filteredCommands = f.search(input);
    };


    var GoogleSearchCommand = function (inputString) {
        this.id = 'GOOGLE1';
        this.input = inputString.trim();
        this.icon = 'google';
        this.action = 'Search Google';
        this.title = 'Google "' + this.input + '"';
        this.description = 'Open Google search results';
    };

    GoogleSearchCommand.prototype.run = function () {
        chrome.tabs.create({ url: 'https://www.google.com/search?q=' + encodeURIComponent(this.input) });
    };

    var GoogleLuckyCommand = function (inputString) {
        this.id = 'GOOGLE2';
        this.input = inputString.trim();
        this.icon = 'google';
        this.action = 'Get Lucky';
        this.title = 'I\'m Feeling Lucky';
        this.description = 'Open the first result from Google';
    };

    GoogleLuckyCommand.prototype.run = function () {
        chrome.tabs.create({ url: 'https://www.google.com/search?btnI=I&q=' + encodeURIComponent(this.input) });
    };

    Winston.Package.register('Google', Google);
})(Winston);