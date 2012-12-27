(function () {
  var $ = jQuery,
    tempContainer = document.createElement('DIV'),
    tagCache = {},
    cutted = null,

    Assets = {

    selectedElement : null,

    deselect : function () {
      var element = null, removeSelectedClass = function (el) {
        var  cl, i, cl_arr;
        if (el) {
          if (el.removeClass) {
            el.removeClass('selected');
          } else if (el.attributes && el.attributes['class']) {
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

    select : function (element) {
      this.deselect();
      this.selectedElement = element;
      this.selectedElement.addClass('selected');
    },

    getSelected : function (editor) {
      if (this.selectedElement) {
        return this.selectedElement;
      }
      var node, range = editor.getSelection().getRanges()[0];
      range.shrink(CKEDITOR.SHRINK_TEXT);
      node = range.startContainer;
      while (node && !(node.type === CKEDITOR.NODE_ELEMENT && node.data('asset-cid'))) {
        node = node.getParent();
      }
      return node;
    },

    parseId : function (tag_id) {
      var arr = tag_id.split(':'), obj = {'aid' : arr[0], 'type' : arr[1], 'hash' : arr[2]};
      return arguments.length > 1 ? obj[arguments[1]] : obj;
    },

    generateId : function (tag_id) {
      var tagObj = this.parseId(tag_id), time = new Date().getTime();
      return [tagObj.aid, tagObj.type, time].join(':');
    },

    getTagData : function (tag) {
      var matches = tag.match(/\[\[asset:([_a-zA-Z0-9]+):([0-9]+)\s\{((\n|.)*?)\}\]\]/),
        params = {aid: 0, params : {}}, paramsString;
      if (matches) {
        paramsString = matches[3];
        paramsString = '{' + paramsString + '}';

        try {
          params = JSON.parse(paramsString);
          params.aid = matches[2];
          params.type = matches[1];
        }
        catch(err) {

        }
      }
      return params;
    },

    dialog : function (editor, type) {
      return function () {
        return {
          title : 'Media Assets',
          minWidth : 800,
          minHeight : 600,
          contents : [{
            id : 'asset_frame',
            label : 'Add a media asset',
            expand : true,
            elements : [
              {
                type : 'iframe',
                src : Drupal.settings.basePath + 'admin/assets/add/' + type + '/?render=popup',
                width : '100%',
                height : '100%'
              }
            ]
          }],
          buttons : [CKEDITOR.dialog.cancelButton]
        };
      };
    },

    openDialog : function (editor, dialogName, src, element) {
      editor.openDialog(dialogName, function() {
        this.definition.contents[0].elements[0].src = src;
        if (typeof(element) !== 'undefined') {
          this._outdatedAssetEl = element;
        }
      });
    },

    searchDialog : function() {
      return {
        title : 'Media Assets',
        minWidth : 1000,
        minHeight : 600,
        contents : [{
          id : 'asset_frame',
          label : 'Choose an asset from the library',
          expand : true,
          elements : [
            {
              type : 'iframe',
              src : Drupal.settings.basePath + 'admin/assets/search?render=popup',
              width : '100%',
              height : '100%',
              id : 'asset_frame_iframe',

              onContentLoad : function() {
                $(this.getElement().$.contentDocument.body).click(
                  function (event) {
                    var target = event.target, dialog, element, wysiwyg, html;
                    if ($(target).hasClass('assets-item-button')) {
                      var id_arr = target.id.substr(11).split('-'),
                        aid = (id_arr.shift()),
                        type = (id_arr).join('-'),
                        tag_id = [aid, type, new Date().getTime()].join(':');
                        html = Assets.getDataById(tag_id);
                        dialog =  CKEDITOR.dialog.getCurrent();
                      if (html) {
                        element = CKEDITOR.dom.element.createFromHtml(html);
                        element.setAttribute('contentEditable', 'false');   //Hello, Chrome
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
              }
            }
          ]
        }],
        buttons : [CKEDITOR.dialog.cancelButton]
      };
    },

    getContainer : function (tagId, tag, content) {
      tempContainer.innerHTML = content;
      var params = this.getTagData(tag),
        asset_div = tempContainer.firstChild,
        align = params.align;

      asset_div.contentEditable = 'false';
      //asset_div.contenteditable = 'false';
      asset_div.setAttribute('data-asset-cid', tagId);
      asset_div.setAttribute('contentEditable', 'false');
      //asset_div.setAttribute('contenteditable', 'false');
      asset_div.setAttribute('data-cke-editable', 'false');
      if (params.mode === 'full') {
        align = '';
      }
      switch(align) {
        case 'left':
        case 'right':
          break;
        default:
          align = '';
      }
      if (align) {
        asset_div.style.styleFloat = align;
        asset_div.style.cssFloat = align;
      }
      return tempContainer;
    },

    cache : function (tagId, tag, content) {
      var container = this.getContainer(tagId, tag, content), html = container.innerHTML;
      tagCache[tagId] = {tag : tag, html : html};
      container.innerHTML = '';
      return html;
    },
    getTag : function (tagId) {
      if (typeof(tagCache[tagId]) === 'undefined') {
        this.getDataById(tagId);
      }
      return tagCache[tagId].tag;
    },

    getContentByTag : function (tag) {
      var content = '', tagmatches = [], time, tagId;
//
//      for (cid in tagCache) {
//        if (tagCache.hasOwnProperty(cid)) {
//          if (tag === tagCache[cid].tag) {
//            content = tagCache[cid].html;
//            console.log('from the cache');
//            tagId = cid;
//            break;
//          }
//        }
//      }
//      if (!content) {
        $.ajax({
          type: "POST",
          url: Drupal.settings.basePath + "admin/assets/get/",
          data: {tag: tag},
          async: false,
          success:  function (asset_content) {content = asset_content;}
        });
//      }

      tagmatches = tag.match(/\[\[asset:([_a-z0-9]+):([0-9]+)\s\{((.)*?)\}\]\]/);
      time = new Date().getTime();
      tagId = tagmatches[2] + ':' + tagmatches[1]  + ':' + time;
      return this.cache(tagId, tag, content);
    },

    getDataById : function (tagId) {
      var tag = '', content = '';
      $.ajax({
        type: "POST",
        dataType: "json",
        url: Drupal.settings.basePath + 'admin/assets/tag/' + tagId,
        async: false,
        success:  function (data) {
          tag = data.tag.replace(/\\"/g, '"');
          content = data.content;
        }
      });
      return this.cache(tagId, tag, content);
    },

    attach : function (content) {
      var matches = content.match(/\[\[asset:([_a-z0-9]+):([0-9]+)\s\{((.)*?)\}\]\]/g),
        tag, im, clean_tag, html = '', cid;

      if (matches) {
        for (im = 0; im < matches.length; im = im + 1) {
          html = '';
          tag = matches[im];
          clean_tag = tag.replace(/&amp;quot;/g, '"');
          for (cid in tagCache) {
            if (tagCache.hasOwnProperty(cid)) {
               if (clean_tag === tagCache[cid].tag) {
                html = this.cache(this.generateId(cid), clean_tag, tagCache[cid].html);
                break;
              }
            }
          }

          if (!html) {
            html = this.getContentByTag(clean_tag);
          }
          content = content.replace(tag, html);
        }
      }
      return content;
    }
  };

  CKEDITOR.plugins.add('asset', {
      lang : ['en', 'fr', 'ru'],
      buttons : [],

      requires : ['htmlwriter', 'iframedialog'],

      replaceAsset : function (tag_id, tag) {
        if (Assets.outdated) {
          $.ajax({
            type: "POST",
            url: Drupal.settings.basePath + 'admin/assets/get/' + tag_id,
            data: {
              tag: tag
            },
            async: false,
            success:  function (asset_content) {
              var el = Assets.outdated, container = Assets.getContainer(tag_id, tag, asset_content),
                html = container.innerHTML;
              Assets.outdated = null;
              if (html) {
                tagCache[tag_id] = {tag : tag, html : html};
                el.getParent() && el.$.parentNode.replaceChild(container.firstChild, el.$);
              }
              container.innerHTML = '';
            }
          });
        }
      },


      init : function (editor) {

        var path = this.path;
        editor.on('instanceReady', function(evt) {
          var editor = evt.editor;
          editor.document.appendStyleSheet(path + 'assets-editor.css');
        });
        tagCache = {};
        this.Assets = Assets;
//        if (typeof(Drupal.settings.ckeditor.plugins.assets) == 'undefined') {
//          var script = new CKEDITOR.dom.element( 'script' );
//          script.setAttributes( {
//            type : 'text/javascript',
//            src : '/admin/assets/conf' } );
//          script.appendTo( CKEDITOR.document.getHead() );
//
//
//
//          CKEDITOR.scriptLoader.load('/admin/assets/conf', function() {
//            console.log(arguments);
//          }, this, true);
//        }
        var conf = Drupal.settings.ckeditor.plugins.asset, assetType, type, execFn;
        if (!conf) return;

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
              editorFocus : CKEDITOR.env.ie || CKEDITOR.env.webkit
            });

            //editor.addCommand(type, new CKEDITOR.dialogCommand(type));
            editor.ui.addButton(type, {
              label : conf[assetType].name, //editor.lang...,
              command : type,
              icon : this.path + 'buttons/' + conf[assetType].icon
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
        editor.ui.addButton('assetSearch', {
          label : editor.lang.assets_btn_search,
          command : 'assetSearch',
          icon : this.path + 'search.png'
        });


        /*editor.addCss(
          'div.entity-asset.editor {' +
            'cursor: default;' +
            'background-color: #F6F6F2;' +
            'border-color: #F9F9F9;' +
            'padding: 8px;' +
          '}' +
          '.entity-asset.editor.asset-align-left {' +
            'margin: 0 8px 0 0;' +
            'float: left;' +
          '}' +
          '.entity-asset.editor.asset-align-right {' +
            'margin: 0 0 0 8px;' +
            'float: right;' +
          '}' +
          '.entity-asset.editor.selected {' +
             'box-shadow: inset 0 0 5px #0076B9;' +
          '}' +
          '.entity-asset.editor:hover {' +
             'box-shadow: inset 0 0 3px #0076B9; background-color: #F0F8FF;' +
          '}' +
          '.entity-asset.editor.selected:hover {' +
             'box-shadow: inset 0 0 5px #0076B9; background-color: #F0F8FF;' +
          '}'
        );*/

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
          editorFocus : CKEDITOR.env.ie || CKEDITOR.env.webkit
        });

        editor.addCommand('assetEdit', {
          exec: function (editor) {
            var element = Assets.getSelected(editor), tag_id, params, src;
            if (element) {
              Assets.outdated = element;
              tag_id = element.data('asset-cid');
              params = Assets.getTagData(tagCache[tag_id].tag);
              if (!params.align) {
                params.align = 'none';
              }
              src = [
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
          editorFocus : CKEDITOR.env.ie || CKEDITOR.env.webkit
        });

        editor.addCommand('assetDelete', {
          exec: function (editor) {
            var element = Assets.getSelected(editor);
            if (element) {
              element.remove();
            }
          },
          canUndo: false,
          editorFocus : CKEDITOR.env.ie || CKEDITOR.env.webkit
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
          editorFocus : CKEDITOR.env.ie || CKEDITOR.env.webkit
        });

        editor.addCommand('assetPaste', {
          exec: function (editor) {
            if (cutted !== null) {
              Assets.deselect(cutted);
              cutted.setAttribute('contentEditable', 'false');   //Hello, Chrome
              editor.insertElement(cutted);
              cutted = null;
            }
          },
          canUndo: false,
          editorFocus : CKEDITOR.env.ie || CKEDITOR.env.webkit
        });

        editor.on('contentDom', function(evt) {

          editor.document.on('click', function(evt) {
            var element = evt.data.getTarget();
            while(element && !(element.type === CKEDITOR.NODE_ELEMENT && element.data('asset-cid'))) {
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

          editor.document.on('mousedown', function(evt) {
            var element = evt.data.getTarget();
            if (element.is('img')) {
              while(element && !(element.type === CKEDITOR.NODE_ELEMENT && element.data('asset-cid'))) {
                element = element.getParent();
              }
              if (element) {
                evt.data.preventDefault(true);
              }
            }
          });
        });

        if (editor.addMenuItem) {
          editor.addMenuGroup('asset');

          editor.addMenuItem('assetoverride', {
            label: editor.lang.assets_override,
            command: 'assetOverride',
            group: 'asset',
            icon : this.path + 'gear.png'
          });

          editor.addMenuItem('assetedit', {
            label: editor.lang.assets_edit,
            command: 'assetEdit',
            group: 'asset',
            icon : this.path + 'edit.png'
          });

          editor.addMenuItem('assetdelete', {
            label: editor.lang.assets_delete,
            command: 'assetDelete',
            group: 'asset'/*,
            icon : this.path + 'delete.png'*/
          });

          editor.addMenuItem('assetcut', {
            label: editor.lang.assets_cut,
            command: 'assetCut',
            group: 'asset'/*,
            icon : this.path + 'cut.png'*/
          });

          editor.addMenuItem('assetpaste', {
            label: editor.lang.assets_paste,
            command: 'assetPaste',
            group: 'asset'/*,
            icon : this.path + 'paste.png'*/
          });

          editor.addMenuGroup('newline', 200);
          editor.addMenuItems({
            addLineBefore : {
              label : editor.lang.assets_nl_before,
              command : 'addLineBefore',
              group : 'newline',
              order : 1
            },
            addLineAfter : {
              label : editor.lang.assets_nl_after,
              command : 'addLineAfter',
              group : 'newline',
              order : 2
            }
          });
        }

        if (editor.contextMenu) {
          editor.contextMenu.addListener(function (element, selection) {
            var type, conf, menu = {};
            while (element && !(element.type === CKEDITOR.NODE_ELEMENT && element.data('asset-cid'))) {
              element = element.getParent();
            }
            if (element) {
              type = Assets.parseId(element.data('asset-cid'), 'type');
              conf = Drupal.settings.ckeditor.plugins.asset[type];

              if (!(conf.modes.length === 1 && conf.modes.full && !conf.fields.length)) {
                menu.assetoverride = CKEDITOR.TRISTATE_ON;
              }

              menu.assetedit = CKEDITOR.TRISTATE_ON;
              menu.assetdelete = CKEDITOR.TRISTATE_ON;
              menu.assetcut = CKEDITOR.TRISTATE_ON;
              menu.addLineBefore = CKEDITOR.TRISTATE_ON;
              menu.addLineAfter  = CKEDITOR.TRISTATE_ON;

            } else if (cutted !== null) {
              menu = {assetpaste: CKEDITOR.TRISTATE_ON};
            }
            return menu;
          });
        }


        // The paste processor here is just a reduced copy of html data processor.
        var pasteProcessor = function() {
          this.htmlFilter = new CKEDITOR.htmlParser.filter();
        };

        pasteProcessor.prototype = {
          toHtml : function(data) {
            var fragment = CKEDITOR.htmlParser.fragment.fromHtml(data, false),
              writer = new CKEDITOR.htmlParser.basicWriter();

            fragment.writeHtml(writer, this.htmlFilter);
            return writer.getHtml(true);
          }
        };



      /*  var refresh  = false;
        editor.on('afterPaste', function (evt) {
          if (refresh) {
            var wysiwyg = editor.getMode();
            wysiwyg.loadData(wysiwyg.getData());
            refresh = false;
          }
        }, this);*/

        editor.on('paste', function(evt) {
          //Assets.deselect();
         /* var content = editor.getMode().getData();
          var im, tag, clean_tag, matches = content.match(/\[\[asset:([_a-z0-9]+):([0-9]+)\s\{((.)*?)\}\]\]/g);
          var contentItems = {};

          if (matches) {
            for (im = 0; im < matches.length; im = im + 1) {
              tag = matches[im];
              clean_tag = tag.replace( /&amp;quot;/g, '"' );
              var cid;
              for (cid in tagCache) {
                if (tagCache.hasOwnProperty(cid)) {
                  if (clean_tag === tagCache[cid].tag) {
                    if (!contentItems[cid]) {
                      contentItems[cid] = [];
                    }
                    contentItems[cid].push(clean_tag);
                    break;
                  }
                }
              }
            }
          }     */

          var data = evt.data, dataProcessor = new pasteProcessor(), htmlFilter = dataProcessor.htmlFilter,
            processed = {};

          htmlFilter.addRules({
            elements : {
              'div' : function (element) {
                var wrapper, tagId,tag_id;
                Assets.deselect(element);
                if (element.attributes && element.attributes['data-asset-cid']) {
                  tag_id = element.attributes['data-asset-cid'];
                  if (CKEDITOR.env.webkit) return false; //sorry, Chrome
                  if (!processed[tag_id]) {
                    tagId = Assets.generateId(tag_id);
                    if (typeof(tagCache[tag_id]) === 'undefined') { //shouldn't be happen
                      Assets.getDataById(tagId);
                    } else { //add a new cache entry for the new pasted asset (same tag and almost same HTML)
                      Assets.cache(tagId, tagCache[tag_id].tag, tagCache[tag_id].html);
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
          } catch (e) {
            if (typeof(console) !== 'undefined') {
              console.log(editor.lang.assets_error_paste);
//              console.log(e);
            }
          }
          Assets.deselect();
        }, this);
      },

      afterInit : function (editor) {
        // Register a filter to displaying placeholders after mode change.
        var dataProcessor = editor.dataProcessor,
          dataFilter = dataProcessor && dataProcessor.dataFilter,
          htmlFilter = dataProcessor && dataProcessor.htmlFilter,
          HtmlDPtoHtml = dataProcessor && editor.dataProcessor.toHtml;

        if (HtmlDPtoHtml) { //Unprotect some flash tags, force democracy
          editor.dataProcessor.toHtml = function(data, fixForBody) {
            var unprotectFlashElementNamesRegex = /(<\/?)cke:((?:object|embed|param)[^>]*>)/gi;
            data = HtmlDPtoHtml.apply(editor.dataProcessor, [data, fixForBody]);
            return data.replace(unprotectFlashElementNamesRegex, '$1$2');
          };
        }

        if (dataFilter) {
          dataFilter.addRules({
            text : function (text) {
              return Assets.attach(text);
            }
          });
        }

        if (htmlFilter) {
          htmlFilter.addRules({
            elements : {
              'div' : function (element) {
                if (element.attributes && element.attributes['data-asset-cid']) {
                  var tagEl, tag = Assets.getTag(element.attributes['data-asset-cid']);
                  tag = tag.replace( /</g, '&lt;');
                  tag = tag.replace( />/g, '&gt;');

                  tagEl = new CKEDITOR.htmlParser.fragment.fromHtml(tag);
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
})();
