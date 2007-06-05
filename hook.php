<?php
// $Id$

/**
* @file
* short description...
*
* long description...
*/

/**
 * Define module provided asset types.
 * 
 * This hook allows modules to provide asset creation routines to integrate with
 * asset.module.  
 * 
 * @param $op
 *   The operation being performed. Possible values:
 *   - 'info': The wizard is requesting a list of asset creation routines
 *   - 'form': The form for the routine
 *   - 'validate': The validation for the routine.
 *   - 'submit': The submit handler for the routine.
 * @param $delta
 *   The key from the 'info' array, designating which routine to be used.
 * @param $form_values
 *   The form_values array for the validate and submit handlers
 * @return
 *   This varies depending on the op. 
 *   - 'info': An assoc array representing any asset creation routines defined
 *     by the module.  Keys will be used as the delta value for the other ops.
 *     The value should be an assoc array with value, title (optional), and src
 *     (optional) elements.  
 *   - 'form': A valid forms api array.
 *   - 'validate' and 'submit': A valid aid (asset id) if the form does not 
 *     define an aid field.
 */
function hook_asset_type($op = 'info', $delta = NULL, $form_values = array()){
  switch($op){
    case 'info':
      $methods['upload'] = array(
        'value' => t('Asset Upload'),
        'title' => t('Upload a new file.'),
        'src' => url(drupal_get_path('module','asset').'/lullacons/doc-option-add.png'),
      );
      return $methods;
    case 'form':
      $form['upload'] = array(
        '#type' => 'file',
        '#title' => t('New File'),
      );
      return $form;
    case 'validate':
      break;
    case 'submit':
      break;
  }
}

/**
 * Define custom asset formatter(s).
 * 
 * @param $op
 *   The operation being performed. Possible values:
 *   - 'info':
 *   - 'options':
 *   - 'render':
 *   - 'preview':
 *   - 'details':
 *   - 'img':
 * @param $asset
 *   The full asset object being used
 * @param $attr
 *   An array of attributes, either directly created or parsed from a macro
 * @return
 *   - 'info': an array of formatter arrays, each including name (required),
 *     types (required), and description (optional) elements.
 *   - 'options': a forms api array to collect formatting options.
 *   - 'render': the html representation of the macro.
 *   - 'preview': the html preview for the preview pane
 *   - 'details': an array of details with key as t()'ed label
 *   - 'img': the path to an img for use inside WYSIWYG editors 
 */
function hook_asset_formatter($op = 'info', $asset = NULL, $attr = array()){
  switch($op){
    case 'info':
      break;
    case 'options':
      break;
    case 'render':
      break;
    case 'preview':
      break;
    case 'details':
      break;
    case 'img':
      break;
  }    
}

function hook_assetapi($op){
  switch($op){
    case 'load':
      break;
    case 'insert':
      break;
    case 'update':
      break;
    case 'delete':
      break;
  }    
}
