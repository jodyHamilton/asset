// $Id$

/**
 * the following are jslint (http://www.jslint.com) options
 * the syntax is very specific, especially there is no space
 * after the first asterisk
 *
 * the first allows common browser globals like window and document
 * the second says that Drupal and $ are valid global variables
 * 
 * Last successful jslint verification: 2007-12-20
 */
/*jslint browser: true */
/*extern Drupal, $, tb_init, tb_position, tb_remove */

/**
 * Namespace everything within the Drupal.assetWizard
 */
Drupal.assetWizard = {
  // reference to the input/textarea field being used
  input:    null,
  // reference to the parent document object
  parent:   null,
  // object representation of querystring
  args:     null,
  // optional callback on insertion of asset wizard value
  onInsert: null,
  // optional callback on close of wizard
  onClose:  null
};

/**
 * Initialize the asset wizard.  hook up some event callbacks and initialize
 * some variables to be used later.
 */
Drupal.assetWizard.initialize = function(){
	$('.asset-wizard-start').click(
		function(){
			var id = this.id.replace('asset-wizard-', '#');
			Drupal.assetWizard.input = $(id)[0];
		}
	);
	
	$('.asset-wizard-start').each(
		function(){
			var id = this.id.replace('asset-wizard-', '#');
			$(id).focus(
				function(){
					Drupal.assetWizard.textareaInterval = window.setInterval(Drupal.assetWizard.scanTextarea, 1000, this);
				}
			).blur(
				function(){
					clearInterval(Drupal.assetWizard.textareaInterval);
				}
			);
		}
	);
};

/**
 * Scan a textarea to look for selected macros.  If found update the associated
 * asset wizard link's href to point to the options form.
 * 
 * @param {Object} textarea
 *   the textarea to process
 */
Drupal.assetWizard.scanTextarea = function(textarea){
	var text = '';
	/* IE */
  if (window.selection) {
    var cursor = window.selection.createRange();
    text = cursor.text;
  } 
  /* Gecko-based engines: Mozilla, Camino, Firefox, Netscape */
  else if (textarea.selectionStart || textarea.selectionStart == "0") { 
		text = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd);
  } 
  /* Worst case scenario: browsers that don't know about cursor position, Safari, OmniWeb, Konqueror */
  else { 
    text = '';
  }

	// reference to the link
	var link = $('#asset-wizard-' + textarea.id);
	// grab a a copy of link href and reset it to asset/wizard
	var href = link.attr('href').replace(/asset\/wizard[^?]*/, 'asset/wizard');			
	// look for a macro in the selected text
	var macros = Drupal.assetWizard.getMacros(text);
	if(macros[0]){
		var macro = macros[0];
		// parse the macro into attributes
		var attr = Drupal.assetWizard.parseMacro(macro);
		// if the macro has an ID and a format, update the href
		if(attr.aid && attr.format){
			href = href.replace(/asset\/wizard[^?]*/, 'asset/wizard/' + attr.aid + '/' + attr.format + '/' + macro);
		}
	}
	// update the link
	link.attr('href', href);
};

/**
 * Parse a macro into an array of attributes
 * 
 * @param {String} macro
 * @return {Array}
 * 	 An array of key=>value attributes
 */
Drupal.assetWizard.parseMacro = function(macro){
	if(!macro){
		return {};
	}
	macro = macro.replace(/^\[asset\|/, '').replace(/\]$/, '');
	var pairs = macro.split('|');
	var attr = {};
  for(var i = 0; i < pairs.length; i++) { 		
		var parts = pairs[i].split('=', 2);
		// only deal with key=value pairs
    if (parts.length != 2){
      continue;
    }
    attr[parts[0]] = unescape(parts[1]);
  }
  return attr; // Return the Object
};

/**
 * Build a macro from an array of attributes
 * 
 * @param {Array} attributes
 * @return {String}
 * 	 A string representation of the macro
 */
Drupal.assetWizard.buildMacro = function(attributes){
	var pairs = [];
	for(var key in attributes){
		if(attributes[key]){
			pairs.push(key +'='+ attributes[key]);
		}
	}
	return '[asset|' + pairs.join('|') + ']';
};

/**
 * Search a string for asset macros
 * 
 * @param {String} text
 * @return {Array} 
 *   An array of macros on success, false on failure
 */
Drupal.assetWizard.getMacros = function(text){
  var regex = /\[asset[^\[\]]+\]/g;
	var matches = text.match(regex);
	if(!matches || matches.length < 1){
		return false;
	}
	return matches;
};

/**
 * This function gets called when the wizard is finished.
 * Any alternative uses of the 
 *
 * @param assetValue - the value returned from the wizard
 */
Drupal.assetWizard.insert = function(assetValue){
  var wizard = Drupal.assetWizard;
  var input = Drupal.assetWizard.input;
  var onInsert = Drupal.assetWizard.onInsert;
  
  if(onInsert && typeof(onInsert) == 'function'){
    onInsert(assetValue);
    Drupal.assetWizard.onInsert = null;
  }
  else{
    // in a textarea we want to overwrite the current selection, 
    // insert at the cursor location or append
    if($(input).is('textarea')){
      wizard.textareaUpdate(input, assetValue);
    }
    // for other inputs, simply replace the value
    else{
      input.value = assetValue;
    }
  }
  
  // allow for an afterInsert callback
  if(wizard.afterInsert && typeof(wizard.afterInsert) == 'function'){
    wizard.afterInsert();
    wizard.afterInsert = null;
  }
  
  // Close the dialog
  wizard.close();
  return false;
};

/**
 * Helper function to update a textarea by overwriting a selection,
 * inserting at cursor, or simply appending to the current value
 */
Drupal.assetWizard.textareaUpdate = function(textarea, value){
  /* IE */
  if (window.selection) {
    textarea.focus();
    var cursor = window.selection.createRange();
    cursor.text = value;
  } 
  /* Gecko-based engines: Mozilla, Camino, Firefox, Netscape */
  else if (textarea.selectionStart || textarea.selectionStart == "0") { 
    var startPos  = textarea.selectionStart;
    var endPos    = textarea.selectionEnd;
    var body      = textarea.value;  
    textarea.value = body.substring(0, startPos) + value + body.substring(endPos, body.length);      
  } 
  /* Worst case scenario: browsers that don't know about cursor position, Safari, OmniWeb, Konqueror */
  else { 
    textarea.value += value;
  }
};

/**
 * Close the wizard.  Called when the cancel button is clicked and after insert
 */
Drupal.assetWizard.close = function(){
  tb_remove();
};

/**
 * getArgs() by Jim K - From Orielly JSB pp 244
 *
 * This function parses comma separated name=value 
 * argument pairs from the query string of the URL. 
 * It stores the name=value pairs in 
 * properties of an object and then returns that object
 */
Drupal.assetWizard.getArgs = function() {
  var args = {};

  var query = window.location.search.substring(1); // Get Query String
  var pairs = query.split("&"); // Split query at the ampersand
  
  for(var i = 0; i < pairs.length; i++) { // Begin loop through the querystring
    var pos = pairs[i].indexOf('='); // Look for "name=value"
    if (pos == -1){
      continue; // if not found, skip to next
    }
    var argname = pairs[i].substring(0,pos); // Extract the name
    var value = pairs[i].substring(pos+1); // Extract the value
    args[argname] = unescape(value); // Store as a property
  }
  return args; // Return the Object
};

function insertToEditor(value){
  Drupal.assetWizard.insert(value);
}

$(document).ready(Drupal.assetWizard.initialize);

/**
 * I need to know when tb get's re-inited so I can also run some of my own init code.
 * I am hijacking the tb_init function, running my own code and then running the 
 * original tb_init.
 */

// duplicate original tb_init
Drupal.assetWizard.tb_init_original = tb_init;

// new tb_init function - make sure to call reference to original function
Drupal.assetWizard.tb_init = function(dom_chunk){
  var options = { 
			beforeSubmit: Drupal.assetWizard.beforeSubmit,
			success: Drupal.assetWizard.formSubmit
  }; 
//	if($("#TB_window").size()){
//		$("#TB_window form").ajaxForm(options);
//	}
  
  // move buttons out of the content pane
  $('#asset-wizard').append($('.wizard-buttons'));
  // hook the moved buttons to their form
  $('.wizard-buttons input.form-submit').click(
    function(){
      $("#asset-wizard form").ajaxSubmit(options);
    }
  );

  // create the close button
  $('#asset-wizard').append(
    $('<a>x</a>').attr(
      {
        'href': '#',
        'class': 'wizard-close'
      }
    ).click(
      function(){
        Drupal.assetWizard.close();
        return false;
      }
    )    
  );
  
	Drupal.assetWizard.tb_init_original(dom_chunk);	
};

// overwrite tb_init with new function
tb_init = Drupal.assetWizard.tb_init;

Drupal.assetWizard.beforeSubmit = function(formData, jqForm, options){
//	console.log($.param(formData));		
};

// on form submit inside thickbox
Drupal.assetWizard.formSubmit = function(data){
	$('#TB_ajaxContent').html(data);
	// copied from line 226 of jquery.thickbox.js
  tb_position();
  $("#TB_load").remove();
  tb_init("#TB_ajaxContent a.thickbox");
  $("#TB_window").css({display:"block"});	
};