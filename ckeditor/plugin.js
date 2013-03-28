/**
 * @file
 * Asset plugin for ckeditor.
 */
var Assets;
(function ($) {
  // Temporary container for asset html.
  var tempContainer = document.createElement('DIV'),
    tagCache = {},
    cutted = null;

  // Assets object.
  Assets = {
    selectedElement: null,

    getCKeditorVersion: function () {
      if (CKEDITOR.version) {
        var explodedVersion = CKEDITOR.version.split('.');
        return explodedVersion[0] ? parseInt(explodedVersion[0]) : null;
      }
    },

    select: function (element) {
      this.deselect();
      this.selectedElement = element;
      this.selectedElement.addClass('selected');
    },

    deselect: function () {
      var element = null, removeSelectedClass = function (el) {
        var cl, i, cl_arr;
        if (el) {
          if (el.removeClass) {
            el.removeClass('selected');
          }
          else {
            if (el.attributes && el.attributes['class']) {
              cl = el.attributes['class'];
              cl_arr = cl.split(' ');
              cl = [];

              for (i = 0; i < cl_arr.length; i = i + 1) {
                if (cl_arr[i] !== 'selected') {
                  cl.push(cl_arr[i]);
                }
              }

              el.attributes['class'] = cl.join(' ');
            }
          }
        }
        return el;
      };

      if (arguments.length && arguments[0]) {
        element = removeSelectedClass(element);
      }

      if (this.selectedElement) {
        removeSelectedClass(this.selectedElement);
        this.selectedElement = null;
      }

      return element;
    },

    getSelected: function (editor) {
      if (this.selectedElement) {
        return this.selectedElement;
      }

      var range = editor.getSelection().getRanges()[0];
      range.shrink(CKEDITOR.SHRINK_TEXT);

      if (range.startContainer) {
        var node = range.startContainer;

        while (node && !(node.type === CKEDITOR.NODE_ELEMENT && node.data('asset-cid'))) {
          node = node.getParent();
        }

        return node;
      }
    },

    parseId: function (tag_id) {
      var arr = tag_id.split(':'), obj = {'aid': arr[0], 'type': arr[1], 'hash': arr[2]};
      return arguments.length > 1 ? obj[arguments[1]] : obj;
    },

    generateId: function (tag_id) {
      var tagObj = this.parseId(tag_id), time = new Date().getTime();
      return [tagObj.aid, tagObj.type, time].join(':');
    },

    getTagData: function (tag) {
      var params = {};
      var matches = tag.match(/\[\[asset:([_a-zA-Z0-9]+):([0-9]+)\s\{((\n|.)*?)\}\]\]/);

      if (matches) {
        var paramsString = matches[3];
        paramsString = '{' + paramsString + '}';

        try {
          params = JSON.parse(paramsString);
          params.aid = matches[2];
          params.type = matches[1];

          if (!params.mode) {
            params.mode = 'full';
          }

          if (!params.align || (params.mode == 'full')) {
            params.align = 'none';
          }
        }
        catch (err) {
          // Empty error handler.
        }
      }

      return params;
    },

    dialog: function (editor, type) {
      return function () {
        return {
          title: 'Media Assets',
          minWidth: 800,
          minHeight: 600,
          contents: [{
            id: 'asset_frame',
            label: 'Add a media asset',
            expand: true,
            elements: [{
              type: 'iframe',
              src: Drupal.settings.basePath + 'admin/assets/add/' + type + '/?render=popup',
              width: '100%',
              height: '100%'
            }]
          }],
          buttons: [CKEDITOR.dialog.cancelButton]
        };
      };
    },

    adjustDialogHeight: function () {
      // CKeditor 4 have bug into plugins/dialog/plugin.js line 1036.
      // Developers forgot to add height:100% into iframe wrapper.
      // In CKeditor 3 this code present.
      setTimeout(function () {
        $('.cke_dialog_contents .cke_dialog_ui_vbox.cke_dialog_page_contents').css('height','100%');
      }, 0);
    },

    openDialog: function (editor, dialogName, src, element) {
      editor.openDialog(dialogName, function () {
        this.definition.contents[0].elements[0].src = src;

        if (typeof(element) !== 'undefined') {
          this._outdatedAssetEl = element;
        }

        // Fix height iframe wrapper issue with ckeditor 4.
        Assets.adjustDialogHeight();
      });
    },

    searchDialog: function () {
      return {
        title: 'Media Assets',
        minWidth: 800,
        minHeight: 600,
        contents: [{
          id: 'asset_frame',
          label: 'Choose an asset from the library',
          expand: true,
          elements: [{
            type: 'iframe',
            src: Drupal.settings.basePath + 'admin/assets/search?render=popup',
            width: '100%',
            height: '100%',
            id: 'asset_frame_iframe',

            onContentLoad: function () {
              $(this.getElement().$.contentDocument.body).click(
                function (event) {
                  var target = event.target, dialog, element, wysiwyg, html;

                  if ($(target).hasClass('assets-item-button')) {
                    var id_arr = target.id.substr(11).split('-'),
                      aid = (id_arr.shift()),
                      type = (id_arr).join('-'),
                      tag_id = [aid, type, new Date().getTime()].join(':');

                    html = Assets.getDataById(tag_id);
                    dialog = CKEDITOR.dialog.getCurrent();
                    if (html) {
                      element = CKEDITOR.dom.element.createFromHtml(html);
                      dialog._.editor.insertElement(element);

                      if (CKEDITOR.env.gecko && html.search(/<object /i) > 0) {
                        wysiwyg = dialog._.editor.getMode();
                        wysiwyg.loadData(wysiwyg.getData());
                      }
                    }

                    dialog.hide();
                  }
                }
              );

              // Fix height iframe wrapper issue with ckeditor 4.
              Assets.adjustDialogHeight();
            }
          }]
        }],
        buttons: [CKEDITOR.dialog.cancelButton]
      };
    },

    getContainer: function (tagId, tag, content) {
      if (tagId && tag && content) {
        var $tempContainer = $(tempContainer);
        $tempContainer.html(content);

        var $asset_div = $tempContainer.children();
        var params = this.getTagData(tag);
        var align = (params.mode == 'full') ? 'none' : params.align;

        if ($asset_div.size()) {
          $asset_div.attr('data-asset-cid', tagId);

          if ((align == 'center') || (align == 'left') || (align == 'right')) {
            // Add special classes for visual feedback in wysiwyg.
            var $image = $asset_div.find('img');
            var $video = $asset_div.find('object');
            if ($image.size() || $video.size()) {
              // Center aligment handler.
              if (align == 'center') {
                if ($image.size()) {
                  $image.css({'margin-left':'auto', 'margin-right':'auto', 'display':'block'});
                }
                else if ($video.size()) {
                  $video.css({'margin-left':'auto', 'margin-right':'auto', 'display':'block'});
                }
              }
              // Left, right handler.
              else {
                if ($image.size()) {
                  $image.css('float', align).parent().siblings('div.field').css('clear', 'both');
                }
                else if ($video.size()) {
                  $video.parents('div.field').css('float', align).next('div.field').css('clear', 'both')
                }
              }
            }
            // Add style to wrapper.
            else {
              if (align == 'center') {
                $asset_div.removeClass('rtecenter').addClass('rtecenter');
              }

              if (align == 'left') {
                $asset_div.removeClass('rteright').addClass('rteleft');
              }

              if (align == 'right') {
                $asset_div.removeClass('rteleft').addClass('rteright');
              }
            }
          }
          // Need for small mode, and none align.
          else {
            $asset_div.removeClass('rteleft rteright rtecenter');
          }
        }
        return tempContainer;
      }
    },

    cache: function (tagId, tag, content) {
      var html = '';
      var container = this.getContainer(tagId, tag, content);
      if (container) {
        html = container.innerHTML;
        tagCache[tagId] = {tag: tag, html: html};
        container.innerHTML = '';
      }
      return html;
    },

    getContentByTag: function (tag) {
      var content = '', tagmatches = [], time, tagId;
      $.ajax({
        type: "POST",
        url: Drupal.settings.basePath + 'admin/assets/get',
        data: {tag: tag},
        async: false,
        success: function (asset_content) {
          if (typeof(asset_content) == null) {
            content = '';
          }
          else {
            content = asset_content;
          }
        }
      });

      tagmatches = tag.match(/\[\[asset:([_a-z0-9]+):([0-9]+)\s\{((.)*?)\}\]\]/);
      time = new Date().getTime();
      tagId = tagmatches[2] + ':' + tagmatches[1] + ':' + time;
      return this.cache(tagId, tag, content);
    },

    getDataById: function (tagId, viewMode, align) {
      if (typeof(tagId) != 'undefined') {
        if (typeof(viewMode) == 'undefined') {
          viewMode = 'default';
        }

        if (typeof(align) == 'undefined') {
          align = 'none';
        }

        var tag = '', content = '';
        $.ajax({
          type: "POST",
          dataType: "json",
          url: Drupal.settings.basePath + 'admin/assets/tag/' + tagId + '/' + viewMode + '/' + align,
          async: false,
          success: function (data) {
            tag = data.tag.replace(/\\"/g, '"');
            content = data.content;
          }
        });

        return this.cache(tagId, tag, content);
      }
    },

    attach: function (content) {
      var matches = content.match(/\[\[asset:([_a-z0-9]+):([0-9]+)\s\{((.)*?)\}\]\]/g),
        tag, im, clean_tag, html = '', cid;

      if (matches) {
        for (im = 0; im < matches.length; im = im + 1) {
          html = '';
          tag = matches[im];
          // @todo: Check that it works, needed because wysiwyg encodes 2 times.
          clean_tag = tag.replace(/&amp;quot;/g, '"');

          // Get from cache.
          for (cid in tagCache) {
            if (tagCache.hasOwnProperty(cid)) {
              if (clean_tag === tagCache[cid].tag) {
                html = this.cache(this.generateId(cid), clean_tag, tagCache[cid].html);
                break;
              }
            }
          }

          // Otherwise get content using ajax and cache it.
          if (!html) {
            html = this.getContentByTag(clean_tag);
          }

          content = content.replace(tag, html);
        }
      }
      return content;
    }
  };

  // Ckeditor plugin body.
  CKEDITOR.plugins.add('asset', {
      lang: ['en', 'fr', 'ru'],
      requires: ['htmlwriter', 'iframedialog'],

      // Callbacks.
      replaceAsset: function (tag_id, tag) {
        if (Assets.outdated) {
          $.ajax({
            type: "POST",
            url: Drupal.settings.basePath + 'admin/assets/get/' + tag_id,
            data: {
              tag: tag
            },
            async: false,
            success: function (asset_content) {
              if (typeof(asset_content) == null) {
                asset_content = '';
              }

              var el = Assets.outdated, container = Assets.getContainer(tag_id, tag, asset_content),
                html = container.innerHTML;
              Assets.outdated = null;

              if (html) {
                tagCache[tag_id] = {tag: tag, html: html};
                el.getParent() && el.$.parentNode.replaceChild(container.firstChild, el.$);
              }
              container.innerHTML = '';
            }
          });
        }
      },

      init: function (editor) {
        var path = this.path;

        // Ckeditor instanceReady event.
        editor.on('instanceReady', function (evt) {
          var editor = evt.editor;
          editor.document.appendStyleSheet(path + 'assets-editor.css');

          if (CKEDITOR.instances && CKEDITOR.env) {
            // For webkit set cursor of wysiwyg to the end to prevent asset in asset pasting.
            if (CKEDITOR.env.webkit) {
              // Handle case for CKeditor 4.
              if (Assets.getCKeditorVersion() >= 4) {
                // Сreate a range for the entire contents of the editor document body.
                var range = editor.createRange();
                // Move to the end of the range.
                range.moveToPosition(range.root, CKEDITOR.POSITION_BEFORE_END);
                // Putting the current selection there.
                editor.getSelection().selectRanges([range]);
              }
            }

            // Fix for CKeditor 3 & Chrome and for CKeditor 4 && FF.
            if ((Assets.getCKeditorVersion() < 4 && CKEDITOR.env.webkit)
              || (Assets.getCKeditorVersion() >= 4 && CKEDITOR.env.gecko)) {
              editor.focus();

              // Getting selection.
              var selected = editor.getSelection();
              // Getting ranges.
              var selected_ranges = selected.getRanges();
              // Selecting the starting node.
              var range = selected_ranges[0];

              if (range) {
                var node = range.startContainer;
                var parents = node.getParents(true);

                node = parents[parents.length - 2].getFirst();
                if (node) {
                  while (true) {
                    var x = node ? node.getNext() : null;

                    if (x == null) {
                      break;
                    }

                    node = x;
                  }

                  selected.selectElement(node);
                }

                selected_ranges = selected.getRanges();
                // False collapses the range to the end of the selected node, true before the node.
                selected_ranges[0].collapse(false);
                // Putting the current selection there.
                selected.selectRanges(selected_ranges);
              }
            }
          }
        });

        // Wrapper for contentDom group events.
        editor.on('contentDom', function (evt) {
          editor.document.on('click', function (evt) {
            var element = evt.data.getTarget();

            while (element && !(element.type === CKEDITOR.NODE_ELEMENT && element.data('asset-cid'))) {
              element = element.getParent();
            }

            if (element) {
              editor.getSelection().selectElement(element);
              Assets.select(element);
            }
            else {
              Assets.deselect(element);
            }
          });

          editor.document.on('mousedown', function (evt) {
            var element = evt.data.getTarget();

            if (element.is('img')) {
              while (element && !(element.type === CKEDITOR.NODE_ELEMENT && element.data('asset-cid'))) {
                element = element.getParent();
              }
              if (element) {
                evt.data.preventDefault(true);
              }
            }
          });
        });

        // Paste event.
        editor.on('paste', function (evt) {
          var data = evt.data, dataProcessor = new pasteProcessor(), htmlFilter = dataProcessor.htmlFilter,
            processed = {};

          htmlFilter.addRules({
            elements: {
              'div': function (element) {
                var wrapper, tagId, tag_id;
                Assets.deselect(element);

                if (element.attributes && element.attributes['data-asset-cid']) {
                  tag_id = element.attributes['data-asset-cid'];

                  // @todo: Check for webkit this functionality is forbidden.
                  if (CKEDITOR.env.webkit) {
                    return false;
                  }

                  if (!processed[tag_id]) {
                    tagId = Assets.generateId(tag_id);

                    if (typeof(tagCache[tag_id]) === 'undefined') {
                      Assets.getDataById(tagId);
                    }

                    processed[tagId] = 1;
                    wrapper = new CKEDITOR.htmlParser.fragment.fromHtml(tagCache[tagId].html);

                    return wrapper.children[0];
                  }
                }
                return element;
              }
            }
          });

          try {
            data['html'] = dataProcessor.toHtml(data['html']);
          }
          catch (e) {
            if (typeof(console) !== 'undefined') {
              console.log(editor.lang.asset.assets_error_paste);
            }
          }
          Assets.deselect();
        }, this);

        // Double click event.
        editor.on('doubleclick', function (evt) {
          var editor = evt.editor;

          // Getting selection.
          var element = Assets.getSelected(editor), tag_id, tag, src;

          // Open dialog frame.
            if (element) {
              Assets.outdated = element;
              tag_id = element.data('asset-cid');
              tag = encodeURIComponent(tagCache[tag_id].tag);
              src = Drupal.settings.basePath + 'admin/assets/override?render=popup&tag=' + tag;
              Assets.openDialog(editor, 'asset_' + Assets.parseId(tag_id, 'type'), src, element);
            }
        });

        // Common functionality for the plugin.
        this.Assets = Assets;

        var conf = Drupal.settings.ckeditor.plugins.asset, assetType, type, execFn;
        if (!conf) {
          return;
        }

        for (assetType in conf) {
          if (conf.hasOwnProperty(assetType)) {
            type = 'asset_' + assetType;
            CKEDITOR.dialog.add(type, Assets.dialog(editor, type));

            execFn = function (assetType) {
              return function (editor) {
                Assets.openDialog(editor, assetType, Drupal.settings.basePath + 'admin/assets/add/' + assetType + '/?render=popup', null);
              };
            };

            editor.addCommand(type, {
              exec: execFn(type),
              canUndo: false,
              editorFocus: CKEDITOR.env.ie || CKEDITOR.env.webkit
            });

            editor.ui.addButton && editor.ui.addButton(type, {
              label: conf[assetType].name,
              command: type,
              icon: this.path + 'buttons/' + conf[assetType].icon
            });
          }
        }

        var _getEnterElement = function (editor) {
          switch (editor.config.enterMode) {
            case CKEDITOR.ENTER_P:
              return editor.document.createElement('p');
            case CKEDITOR.ENTER_DIV:
              return editor.document.createElement('div');
              break;
          }

          return editor.document.createElement('br');
        };

        // Add commands for asset.
        editor.addCommand('addLineAfter', {
          exec: function (editor) {
            var node = Assets.getSelected(editor), newline;

            if (node) {
              newline = _getEnterElement(editor);
              newline.insertAfter(node);
            }
          },
          canUndo: true
        });

        editor.addCommand('addLineBefore', {
          exec: function (editor) {
            var node = Assets.getSelected(editor), newline;

            if (node) {
              newline = _getEnterElement(editor);
              newline.insertBefore(node);
            }
          },
          canUndo: true
        });

        CKEDITOR.dialog.add('assetSearch', Assets.searchDialog);
        editor.addCommand('assetSearch', new CKEDITOR.dialogCommand('assetSearch'));
        editor.ui.addButton && editor.ui.addButton('assetSearch', {
          label: (Assets.getCKeditorVersion() >= 4) ? editor.lang.asset.assets_btn_search : editor.lang.assets_btn_search,
          command: 'assetSearch',
          icon: this.path + 'search.png'
        });

        editor.addCommand('assetOverride', {
          exec: function (editor) {
            var element = Assets.getSelected(editor), tag_id, tag, src;
            if (element) {
              Assets.outdated = element;
              tag_id = element.data('asset-cid');
              tag = encodeURIComponent(tagCache[tag_id].tag);
              src = Drupal.settings.basePath + 'admin/assets/override?render=popup&tag=' + tag;
              Assets.openDialog(editor, 'asset_' + Assets.parseId(tag_id, 'type'), src, element);
            }
          },
          canUndo: false,
          editorFocus: CKEDITOR.env.ie || CKEDITOR.env.webkit
        });

        editor.addCommand('assetEdit', {
          exec: function (editor) {
            var element = Assets.getSelected(editor);
            if (element) {
              Assets.outdated = element;

              var tag_id = element.data('asset-cid');
              var params = Assets.getTagData(tagCache[tag_id].tag);
              var src = [
                Drupal.settings.basePath + 'admin/assets/edit',
                params.aid,
                params.mode,
                params.align,
                '?render=popup'
              ].join('/');

              Assets.openDialog(editor, 'asset_' + Assets.parseId(tag_id, 'type'), src, element);
            }
          },
          canUndo: false,
          editorFocus: CKEDITOR.env.ie || CKEDITOR.env.webkit
        });

        editor.addCommand('assetDelete', {
          exec: function (editor) {
            var element = Assets.getSelected(editor);

            if (element) {
              element.remove();
            }
          },
          canUndo: false,
          editorFocus: CKEDITOR.env.ie || CKEDITOR.env.webkit
        });

        editor.addCommand('assetCut', {
          exec: function (editor) {
            var element = Assets.getSelected(editor);

            if (element) {
              cutted = element;
              element.remove();
            }
          },
          canUndo: false,
          editorFocus: CKEDITOR.env.ie || CKEDITOR.env.webkit
        });

        editor.addCommand('assetPaste', {
          exec: function (editor) {
            if (cutted !== null) {
              Assets.deselect(cutted);
              editor.insertElement(cutted);
              cutted = null;
            }
          },
          canUndo: false,
          editorFocus: CKEDITOR.env.ie || CKEDITOR.env.webkit
        });

        // Create context menu.
        if (editor.addMenuItem) {
          editor.addMenuGroup('asset_operations', 100);

          editor.addMenuItems({
            assetcut: {
              label: (Assets.getCKeditorVersion() >= 4) ? editor.lang.asset.assets_cut : editor.lang.assets_cut,
              command: 'assetCut',
              group: 'asset_operations',
              icon: this.path + 'cut.png',
              order: 1
            },
            assetpaste: {
              label: (Assets.getCKeditorVersion() >= 4) ? editor.lang.asset.assets_paste : editor.lang.assets_paste,
              command: 'assetPaste',
              group: 'asset_operations',
              icon: this.path + 'paste.png',
              order: 2
            },
            assetdelete: {
              label: (Assets.getCKeditorVersion() >= 4) ? editor.lang.asset.assets_delete : editor.lang.assets_delete,
              command: 'assetDelete',
              group: 'asset_operations',
              icon: this.path + 'delete.png',
              order: 3
            }
          });

          editor.addMenuGroup('asset_newline', 200);
          editor.addMenuItems({
            addLineBefore: {
              label: (Assets.getCKeditorVersion() >= 4) ? editor.lang.asset.assets_nl_before : editor.lang.assets_nl_before,
              command: 'addLineBefore',
              group: 'asset_newline',
              order: 1
            },
            addLineAfter: {
              label: (Assets.getCKeditorVersion() >= 4) ? editor.lang.asset.assets_nl_after : editor.lang.assets_nl_after,
              command: 'addLineAfter',
              group: 'asset_newline',
              order: 2
            }
          });

          editor.addMenuGroup('asset_edit', 300);
          editor.addMenuItems({
            assetoverride: {
              label: (Assets.getCKeditorVersion() >= 4) ? editor.lang.asset.assets_override : editor.lang.assets_override,
              command: 'assetOverride',
              group: 'asset_edit',
              icon: this.path + 'override.png',
              order: 1
            },
            assetedit: {
              label: (Assets.getCKeditorVersion() >= 4) ? editor.lang.asset.assets_edit : editor.lang.assets_edit,
              command: 'assetEdit',
              group: 'asset_edit',
              icon: this.path + 'edit.png',
              order: 2
            }
          });
        }

        if (editor.contextMenu) {
          // Remove items from div plugin.
          editor.removeMenuItem('editdiv');
          editor.removeMenuItem('removediv');
          // Remove default menu item paste.
          editor.removeMenuItem('paste');

          editor.contextMenu.addListener(function (element, selection) {
            var type, conf, menu = {};

            while (element && !(element.type === CKEDITOR.NODE_ELEMENT && element.data('asset-cid'))) {
              element = element.getParent();
            }

            // Open context menu.
            if (element) {
              // Select asset element, if element wasn't selected before.
              if (!element.hasClass('selected')) {
                Assets.select(element)
              }

              type = Assets.parseId(element.data('asset-cid'), 'type');
              conf = Drupal.settings.ckeditor.plugins.asset[type];

              menu.assetcut = CKEDITOR.TRISTATE_ON;
              menu.assetdelete = CKEDITOR.TRISTATE_ON;
              menu.addLineBefore = CKEDITOR.TRISTATE_ON;
              menu.addLineAfter = CKEDITOR.TRISTATE_ON;
              menu.assetedit = CKEDITOR.TRISTATE_ON;

              if (conf && conf.modes && !(conf.modes.length === 1 && conf.modes.full && !conf.fields.length)) {
                menu.assetoverride = CKEDITOR.TRISTATE_ON;
              }
            }
            else {
              if (cutted !== null) {
                menu = {assetpaste: CKEDITOR.TRISTATE_ON};
              }
            }

            return menu;
          });
        }

        // The paste processor here is just a reduced copy of html data processor.
        var pasteProcessor = function () {
          this.htmlFilter = new CKEDITOR.htmlParser.filter();
        };

        pasteProcessor.prototype = {
          toHtml: function (data) {
            var fragment = CKEDITOR.htmlParser.fragment.fromHtml(data, false),
              writer = new CKEDITOR.htmlParser.basicWriter();

            fragment.writeHtml(writer, this.htmlFilter);
            return writer.getHtml(true);
          }
        };
      },

      afterInit: function (editor) {
        // Register a filter to displaying placeholders after mode change.
        var dataProcessor = editor.dataProcessor,
          dataFilter = dataProcessor && dataProcessor.dataFilter,
          htmlFilter = dataProcessor && dataProcessor.htmlFilter,
          HtmlDPtoHtml = dataProcessor && editor.dataProcessor.toHtml;

        if (HtmlDPtoHtml) {
          // Unprotect some flash tags, force democracy.
          editor.dataProcessor.toHtml = function (data, fixForBody) {
            var unprotectFlashElementNamesRegex = /(<\/?)cke:((?:object|embed|param)[^>]*>)/gi;
            data = HtmlDPtoHtml.apply(editor.dataProcessor, [data, fixForBody]);

            return data.replace(unprotectFlashElementNamesRegex, '$1$2');
          };
        }

        if (dataFilter) {
          dataFilter.addRules({
            text: function (text) {
              return Assets.attach(text);
            }
          });
        }

        if (htmlFilter) {
          htmlFilter.addRules({
            elements: {
              'div': function (element) {
                if (element.attributes && element.attributes['data-asset-cid']) {
                  var tag_id = element.attributes['data-asset-cid'];

                  var tag = tagCache[tag_id].tag;
                  tag = tag.replace(/</g, '&lt;');
                  tag = tag.replace(/>/g, '&gt;');

                  var tagEl = new CKEDITOR.htmlParser.fragment.fromHtml(tag);
                  return tagEl.children[0];
                }

                return element;
              }
            }
          });
        }
      }
    }
  );
})(jQuery);
