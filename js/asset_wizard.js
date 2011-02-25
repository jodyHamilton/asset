
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
  onClose:  null,
  // history array
  history: []
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
      
      $preview = $(id).parent().find('.asset-textfield-preview a');
      
      if($preview.size()){
        Drupal.assetWizard.preview = $preview;
        Drupal.assetWizard.afterInsert = Drupal.assetWizard.textfieldPreview;
      }
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
      // we could make this a hidden input in the form code, but just hiding it here
      // allows non-javascript users at least a little functionality.
      $(id).filter('.form-text').hide();
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
    wizard.afterInsert(assetValue);
    wizard.afterInsert = null;
  }
  
  // fire 'notify' event
  $.event.trigger('assetWizardInsert', [this, assetValue]);
  
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

Drupal.assetWizard.textfieldPreview = function(aid){
//  Drupal.assetWizard.preview.load(Drupal.settings.assetWizard.assetUrl + '/' + aid + '/icon/ajax');
  Drupal.assetWizard.preview = null;
};

/**
 * Close the wizard.  Called when the cancel button is clicked and after insert
 */
Drupal.assetWizard.close = function(){
  tb_remove();
};

function insertToEditor(value){
  Drupal.assetWizard.insert(value);
}

$(document).ready(Drupal.assetWizard.initialize);

/**
 * ajax form submit callbacks
 */
Drupal.assetWizard.beforeSubmit = function(formData, jqForm, options){
//	console.log($.param(formData));
  $('.wizard-content').addClass('wizard-loading');		
};

// on form submit inside thickbox
Drupal.assetWizard.formSubmit = function(data){
	$('#TB_ajaxContent').html(data);
	// copied from line 226 of jquery.thickbox.js
  tb_position();
  $("#TB_load").remove();
  tb_init("#TB_ajaxContent a.thickbox");
  $("#TB_window").css({display:"block"});	
  $('.wizard-content').removeClass('wizard-loading');		
};

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
  // also make sure to hook up original form submit enter key submits
	$("#TB_window form").ajaxForm(options);
  // add a back button
  
  if (Drupal.assetWizard.history.length > 0) {
    $('<a>Back</a>').attr(
      {
        'src': Drupal.assetWizard.history.pop,
        'class': 'wizard-back'
      }
    ).prependTo($('.wizard-buttons')[0]);
  }

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
  
  $('#asset-wizard .help').each(
    function(){
      $(this).wrap('<div class="help-wrapper"></div>');
      
    }
  );
  
  $(dom_chunk).click(
    function(){
      Drupal.assetWizard.history.push(this.href);  
    }
  );
	Drupal.assetWizard.tb_init_original(dom_chunk);	
};

// overwrite tb_init with new function
tb_init = Drupal.assetWizard.tb_init;
