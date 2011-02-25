
/**
 * the following are jslint (http://www.jslint.com) options
 * the syntax is very specific, especially there is no space
 * after the first asterisk
 *
 * the first allows common browser globals like window and document
 * the second says that Drupal and $ are valid global variables
 * 
 * Last successful jslint verification: 2007-12-08
 */
/*jslint browser: true */
/*extern Drupal, $, tinyMCE, tb_show */

/* Import plugin specific language pack */
tinyMCE.importPluginLanguagePack('drupalasset', 'en');

var TinyMCE_DrupalAssetPlugin = {
	getInfo : function() {
		return {
			longname : 'DrupalAsset',
			author : 'Roger Lopez, adapted from code by Benjamin Shell',
			authorurl : 'http://www.digett.com',
			infourl : 'http://drupal.org/project/asset',
			version : tinyMCE.majorVersion + "." + tinyMCE.minorVersion
		};
	},

	initInstance : function(inst) {
		if (!tinyMCE.settings.drupalasset_skip_plugin_css){
			tinyMCE.importCSS(inst.getDoc(), tinyMCE.baseURL + "/plugins/drupalasset/drupalasset.css");
		}
	},

	getControlHTML : function(cn) {
		if(cn == "drupalasset"){
			// make sure that the Drupal.assetWizard object is available
			if(Drupal.assetWizard){	
				return tinyMCE.getButtonHTML(cn, 'lang_drupalasset_desc', '{$pluginurl}/images/doc-option-add.png', 'mceDrupalAsset');
			}
		}

		return "";
	},
	
	execCommand : function(editor_id, element, command, user_interface, value) {
		if(command == "mceDrupalAsset") {
      var instance = tinyMCE.getInstanceById(editor_id);
			// local scope url variable, since this may get changed
			var url = Drupal.settings.assetWizard.url;
			
			// Modify url if selected element is an asset
      var selected = instance.getFocusElement();
			if (selected !== null && $(selected).is('.mceItemDrupalAsset')) {
				var macro = Drupal.assetWizard.parseMacro(unescape(tinyMCE.getAttrib(selected,'macro')));
				url += '/' + macro.aid + '/' + macro.format;
			}

			// sanity check: make sure thickbox is available				
      if(window.tb_show){
				var settings = Drupal.settings.assetWizard;
        tb_show('Insert Asset', url + '?height=' + settings.height + '&width=' + settings.width);
        Drupal.assetWizard.onInsert = TinyMCE_DrupalAssetPlugin.onInsert;
      }
      else{
        alert('Error loading asset wizard: Thickbox not loaded.');
      }
			return true;
		}

	   // Pass to next handler in chain
	   return false;
	},
	
	cleanup : function(type, content) {
		var i, macro;
	
		switch (type) {
			case "insert_to_editor_dom":
				break;
			case "get_from_editor_dom":
				break;
			case "insert_to_editor": 
				// called when TinyMCE loads existing data or when updating code using Edit HTML Source plugin 
				// Parse all drupalasset filter tags and replace them with asset placeholders
				var macros = Drupal.assetWizard.getMacros(content);
				for(i=0; i < macros.length; i++){
					// save the original matched string for replacement later
					var macroString = macros[i];
					// parse the macro into an array
					macro = Drupal.assetWizard.parseMacro(macroString);
          macro.macroString = macroString;
          var img = TinyMCE_DrupalAssetPlugin.buildImgTag(macro);
          
					// build the img string
//					var img = '<img src="' + src + '" ';
//          img += 'width="' + macro.width + '" height="' + macro.height + '" ';
//					img += 'alt="' + macro.alt + '" title="' + macro.title + '" class="mceItemDrupalAsset" ';
//					img += 'macro="' + escape(macroString) + '" />';
					
					//replace the original string with the img tag string
					content = content.replace(macroString, img);
				}
				break;

			case "get_from_editor":
				// called when TinyMCE exits or when the Edit HTML Source plugin is clicked
				// Parse all image placeholders and replace them with drupalasset filter tags
				var tags = TinyMCE_DrupalAssetPlugin.getAssetTags(content);
				for(i=0; i < tags.length; i++){
					// save the original matched string for replacement later
					var tagString = tags[i];
					// use jQuery to create an img node so we dont have to do parsing! :)
					var imgNode = $(tagString)[0];
					// get the original macro to use as the base for our new macro
					macro = Drupal.assetWizard.parseMacro(unescape(tinyMCE.getAttrib(imgNode,'macro')));

					// allow certain img attributes to override the macro attributes
					var overrides = ['height','width'];
					for(var j=0; j < overrides.length; j++){
            var key = overrides[j];
						if(imgNode[key]){
							macro[key] = imgNode[key];
						}
					}

					// replace the original string with the macro
					content = content.replace(tagString, Drupal.assetWizard.buildMacro(macro));
				}
				break;
		}

		// Pass through to next handler in chain
		return content;
	},

	handleNodeChange : function(editor_id, node, undo_index, undo_levels, visual_aid, any_selection) {
		if (node === null){
			return;
		}

    var id = editor_id + "_drupalasset";

		do {
			if ($(node).is('.mceItemDrupalAsset')) {
				tinyMCE.switchClass(editor_id + '_drupalasset', 'mceButtonSelected');
				return true;
      }
		} while ((node = node.parentNode));

		tinyMCE.switchClass(editor_id + '_drupalasset', 'mceButtonNormal');

		return true;
	},
  
  buildImgTag: function(macro){
    var imgAttr = [];
    // img src can be set by a formatter option named wysiwyg
    macro.src = Drupal.settings.assetWizard.assetUrl + '/' + macro.aid + '/img';
    if(macro.wysiwyg){
      macro.src = decodeURIComponent(macro.wysiwyg);
    }
    var imgAttr = ['src', 'width', 'height', 'alt', 'title'];
    var pairs = [];
    for(var j=0; j < imgAttr.length; j++){
      var key = imgAttr[j];
      if(macro[key]){
        pairs.push(key +'="'+ macro[key] +'"');
      }
    }
    pairs.push('macro="' + escape(macro.macroString) +'"');
    pairs.push('class="mceItemDrupalAsset"');
    
    return '<img ' + pairs.join(' ') + ' />';
  },
  
  getAssetTags: function(text){
    var regex = /<img[^<>]+>/g;
    var matches = text.match(regex);
      if(!matches || matches.length < 1){
        return false;
      }
    return matches;  
  },
  
  onInsert: function(content){
    // do macro replacement on the content from the wizard
    content = TinyMCE_DrupalAssetPlugin.cleanup('insert_to_editor',content);
    // insert the content
    tinyMCE.execCommand("mceInsertContent", true, content);
    tinyMCE.selectedInstance.repaint();          
  }
  
	
};

tinyMCE.addPlugin("drupalasset", TinyMCE_DrupalAssetPlugin);
