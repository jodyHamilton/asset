/**
 * assetWizardCCK object for namespacing the following functions.
 */
Drupal.assetWizardCCK = {};

Drupal.assetWizardCCK.initialize = function(){
  // Add asset button
  Drupal.assetWizardCCK.initOperations();
  
  // initialize multiple fields
//  Drupal.assetWizardCCK.hideEmptyFields();
  $('.asset-field-multiple').each(
    function(){
      Drupal.assetWizardCCK.compactMultiples(this);
    }
  );
  
  // attach assetWizardInsert event handler    
  $(window).bind('assetWizardInsert', Drupal.assetWizardCCK.onAssetWizardInsert);

}

Drupal.assetWizardCCK.initializeMultiples = function(fieldset){
  $('.form-item', fieldset).each(
    function(){
      var item = this;
      if(parseInt($('.form-asset', item).val()) > 0){
        $(item).hide();
      }
      else{
        $icon = $('.assetfield-icon', item);
        if($icon.size()){
          var aid = $('.form-asset', item).val();
          $icon.load(Drupal.settings.assetWizard.assetUrl + '/' + aid + '/icon/ajax');
        }
        x = i + 1;
      }
    }
  );
      
};

/**
 * Shift all values to the front of the multiple field array, ensure that all 
 * populated items are visible, and vice-versa.
 * @param fieldset
 *   the fieldset containing multiple asset form-items
 */
Drupal.assetWizardCCK.compactMultiples = function(fieldset){
  var values = [];
  $('.form-asset', fieldset).each(
    function(){
      var value = $(this).val();
      if (value && value > 0) {
        values.push(value);
      }
      $(this).val(0);
    }
  );  
  
  $('.form-item', fieldset).each(
    function(i){
      if (values[i]) {
        $(this).show().find('.form-asset').val(values[i]);
      }
      else{
        $(this).hide().find('.form-asset').val(values[i]);
      }
    }
  );
}

/**
 * Hide empty form-items on multiple form-fields, leaving 1 empty item visibe to
 * add another item.  This assumes that all multiple fields are front-loaded, 
 * i.e. if the form-item at index 3 is not empty, the items from 0-3 will be 
 * shown, and if there is an item 4, it will be shown as the new item.
 */
Drupal.assetWizardCCK.hideEmptyFields = function(){
  $('.asset-field-multiple').each(
    function(){
      var fieldset = this;
      var empty = [];
      
      Drupal.assetWizardCCK.compactMultiples(fieldset);
      
      $('.form-item', fieldset).each(
        function(i){
          var item = this;
          var val = $('.form-asset', item).val();
          if(!val || val <= 0){
            $(item).hide();
            empty.push(i);
          }
          else if($('.asset-remove', item).size() == 0){
            $('<a href="#" class="asset-remove">Remove</a>')
              .click(Drupal.assetWizardCCK.onRemoveClick)
              .wrap('<li></li>').parent().appendTo($('.assetfield-operations', item));
          }
          
          Drupal.assetWizardCCK.updatePreview($('.form-asset', item)[0]);
        }
      );

      if (empty.length > 0) {
//        $('.form-item', fieldset).eq(empty[0]).show();
      }
    }
  );
};

Drupal.assetWizardCCK.initOperations = function(){
  $('.asset-field-multiple').each(
    function(){
      var fieldset = this;      
      $('<span class="add">New asset</span>')
        .click(Drupal.assetWizardCCK.addMultiple)
        .insertAfter($('legend', fieldset));
        
      $('.assetfield-container', fieldset).each(
        function(){
          $ops = $('<div class="ops"></div>');
          $('<span class="edit">Edit</span>')
            .click(Drupal.assetWizardCCK.editMultiple)
            .appendTo($ops);
          $('<span class="remove">Remove</span>')
            .click(Drupal.assetWizardCCK.removeMultiple)
            .appendTo($ops);
          $(this).append($ops)
        }
      );
    }
  );
};

Drupal.assetWizardCCK.addMultiple = function(){
  var $fieldset = $(this).parents().filter('fieldset');
  Drupal.assetWizardCCK.compactMultiples($fieldset);
  $('.form-item:hidden a.asset-wizard-start', $fieldset).eq(0).trigger('click');  
};

Drupal.assetWizardCCK.removeMultiple = function(){
  var $fieldset = $(this).parents().filter('fieldset');
  $(this).parents().filter('.form-item').find('.form-asset').val(0);
  Drupal.assetWizardCCK.compactMultiples($fieldset);
};

Drupal.assetWizardCCK.editMultiple = function(){
  $(this).parents().filter('.form-item').find('a.asset-wizard-start').trigger('click');  
  
};

Drupal.assetWizardCCK.updatePreview = function(input){
  var input = input || Drupal.assetWizard.input;
  var value = $(input).val();
  var $item = $(input).parents().filter('.form-item');
  
  if (value && value > 0) {
    $.getJSON(Drupal.settings.assetWizard.assetUrl + 'field/' + value, 
      function(data){
        $('.assetfield-icon img', $item).attr('src', data.icon);
        $('.assetfield-title', $item).html(data.title);
      }
    );
  }
  else{
    $('.assetfield-icon img', $item).attr('src', Drupal.settings.assetWizard.noIcon);
    $('.assetfield-title', $item).html('');
  }
    
}

/**
 * assetWizardInsert event handler
 * 
 * @param {Object} e
 *   the jQuery normalized event object
 * @param {Object} wizard
 *   the Drupal.assetWizard object
 * @param {int} value
 *   the value being inserted into the field
 */
Drupal.assetWizardCCK.onAssetWizardInsert = function(e, wizard, aid){
  Drupal.assetWizardCCK.hideEmptyFields();   
  Drupal.assetWizardCCK.updatePreview();   
}

Drupal.assetWizardCCK.onRemoveClick = function(e){
  var item = $(this).parents().filter('.form-item');
  $('.form-asset', item).val(0);
  $(item).slideUp('fast', Drupal.assetWizardCCK.hideEmptyFields);
  this.blur();
  $(this).remove();
  return false;
}

$(document).ready(Drupal.assetWizardCCK.initialize);

