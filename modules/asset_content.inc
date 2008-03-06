<?php

/**
 * Implementation of hook_field_info().
 */
function asset_field_info() {
  return array(
    'asset' => array('label' => 'Asset'),
  );
}

/**
 * Implementation of hook_field_settings().
 */
function asset_field_settings($op, $field) {
  switch ($op) {
    case 'form':
      
      $type_options = array();
      $types = asset_get_types();
      foreach($types as $key => $type){
        $type_options[$key] = $type->name;
      }
      $form['allowed_types'] = array(
        '#type' => 'checkboxes',
        '#title' => t('Allowed asset types'),
        '#description' => t('Limit the selectable assets to only assets of the selected type(s).'),
        '#options' => $type_options,
        '#default_value' => $field['allowed_types'], 
      );
      $form['allowed_extensions'] = array(
        '#type' => 'textfield',
        '#title' => t('Allowed file extensions'),
        '#description' => t('Filter the available file type assets by this comma separated list of file extensions.  This only applies to File assets.  Ex: jpg,gif,png'),
        '#default_value' => $field['allowed_extensions'],
      );
      
      $options = array();
      $formatters = asset_get_formatters();
      foreach($formatters as $key => $formatter){
        $options[$key] = $formatter->name;
      }
      $form['valid_formatters'] = array(
        '#type' => 'select',
        '#title' => t('Valid formatters'),
        '#description' => t('Limit the selectable assets to only assets that support these formatters.  Leave empty to allow all assets.'),
        '#options' => $options,
        '#multiple' => TRUE,
        '#size' => min(count($options), 10),
        '#default_value' => $field['valid_formatters'],
      );
      return $form;

    case 'save':
      return array('allowed_types', 'allowed_extensions', 'valid_formatters');

    case 'database columns':
      return array(
        'aid' => array('type' => 'int', 'length' => '10', 'not null' => TRUE, 'default' => 0),
      );

    case 'filters':
      return array();
      break;
  }
}

/**
 * Implementation of hook_field().
 */
function asset_field($op, &$node, $field, &$items, $teaser, $page) {
  switch ($op) {
    case 'validate':
      if($field['allowed_extensions']){
        $allowed_extensions = array_map('trim', explode(',', $field['allowed_extensions']));
      }
      
      foreach($items as $delta => $item){
        $error_field = $field['field_name'] .']['. $delta .'][aid';
        if(!$item['aid']){
          continue;
        }
        $asset = asset_load($item['aid']);
        
        // make sure selected asset is allowed type
        if(is_array($field['allowed_types']) && !$field['allowed_types'][$asset->type]){
          form_set_error($error_field, t('The selected asset type is not allowed.'));
        }
        
        // make sure selected asset is allowed extension
        if($asset->type == 'file' && $allowed_extensions){
          $info = pathinfo($asset->file['filename']);
          if(!in_array($info['extension'], $allowed_extensions)){
            form_set_error($error_field, t('The selected asset is not one of the allowed extensions.'));
          }
        }
        
        // make sure asset supports one of the valid formatters
        if($field['valid_formatters']){
          $valid = FALSE;
          foreach($field['valid_formatters'] as $format){
            if($asset->formatters[$format]){
              $valid = TRUE;
              break;
            }
          }
          if(!$valid){
            form_set_error($error_field, t('Asset does not support the specified formatters.'));
          }
        }
      }
      
      break;

    case 'view':
      break;
  }
}

/**
 * Implementation of hook_field_formatter_info().
 */
function asset_field_formatter_info() {
  $formatters = array(
    'default' => array(
      'label' => t('Default'),
      'field types' => array('asset'),
    ),
    'icon' => array(
      'label' => t('Asset Icon'),
      'field types' => array('asset'),
    ),
  );

  $asset_formatters = asset_get_formatters();
  foreach($asset_formatters as $key => $formatter){
    $formatters[$key] = array(
      'label' => $formatter->name,
    	'field types' => array('asset'),
    );  
  }
  
  return $formatters;
}

/**
 * Implementation of hook_field_formatter().
 *
 */
function asset_field_formatter($field, $item, $formatter, $node) {
  $asset = asset_load($item['aid']);
  if($asset->aid){
    switch($formatter){
      case 'default':
        return asset_view($asset);
      case 'icon':
        return asset_icon($asset);
      default:
        return asset_render($asset, array('format' => $formatter));
    }
  }
}

/**
 * Implementation of hook_widget_info().
 */
function asset_widget_info() {
  return array(
    'asset' => array(
      'label' => t('Asset Wizard'),
      'field types' => array('asset'),
    ),
    'directory' => array(
      'label' => t('Asset Directory List'),
      'field types' => array('asset'),
    ),
  );
}

/**
 * Implementation of hook_widget_settings().
 */
function asset_widget_settings($op, $widget) {
  switch ($op) {
    case 'form':
      $form = array();
      if($widget['type'] == 'directory'){
        $form['parent'] = array(
          '#type' => 'select',
          '#title' => t('Parent Directory'),
          '#options' => asset_directory_options(), 
          '#default_value' => $widget['parent'],
        );
      }
      return $form;

    case 'validate':
      break;

    case 'save':
      if($widget['type'] == 'directory'){
        return array('parent');
      }
      return array();
  }
}


/**
 * Implementation of hook_widget().
 */
function asset_widget($op, &$node, $field, &$items) {
  switch ($op) {
    case 'form':
      $form = array();      
      $return_type = 'id';
      $key = 'aid';
      
      drupal_add_js(drupal_get_path('module', 'asset_wizard') .'/js/asset_wizard_cck.js');
      
      $form[$field['field_name']] = array(
        '#tree' => TRUE,
        '#type' => 'fieldset',
        '#title' => $field['widget']['label'],
        '#description' => $field['widget']['description'],
        '#weight' => $field['widget']['weight'],
        '#attributes' => array('class' => $field['multiple'] ? 'asset-field-multiple' : 'asset-field'),
      );

      // Directory List Widget
      if($field['widget']['type'] == 'directory') {
        $directory_options = asset_directory_options();
        // Multiple Directory List Widget
        if ($field['multiple']) {
          $delta = 0;
          foreach ($items as $data) {
            if ($data['aid']) {
              $form[$field['field_name']][$delta]['aid'] = array(
                '#type' => 'select',
                '#default_value' => $data['aid'],
                '#options' => $directory_options,
              );
              $delta++;
            }
          }
          foreach (range($delta, $delta + 10) as $delta) {
            $form[$field['field_name']][$delta]['aid'] = array(
              '#type' => 'select',
              '#default_value' => NULL,
              '#options' => $directory_options,
            );
          }
        }
        // Single Directory List Widget
        else {
          $delta = 0;
          $data = $items[$delta];
          $form[$field['field_name']][$delta]['aid'] = array(
            '#type' => 'select',
            '#default_value' => $data['aid'],
            '#options' => $directory_options,
          );
        }
      }
      // Asset Wizard Widget
      else{
        // Multiple Asset Wizard Widget
        if ($field['multiple']) {
          $delta = 0;
          foreach ($items as $data) {
            if ($data['aid']) {
              $form[$field['field_name']][$delta]['aid'] = array(
                '#type' => 'assetfield',
                '#maxlength' => 255,
                '#default_value' => $data['aid'],
                '#asset_return_type' => $return_type,
                '#asset_config' => $field['field_name'],
              );
              $delta++;
            }
          }
          foreach (range($delta, $delta + 10) as $delta) {
            $form[$field['field_name']][$delta]['aid'] = array(
              '#type' => 'assetfield',
              '#maxlength' => 255,
              '#default_value' => NULL,
              '#asset_return_type' => $return_type,
              '#asset_config' => $field['field_name'],
            );
          }
        }
        // Single Asset Wizard Widget
        else {
          $delta = 0;
          $data = $items[$delta];
          $form[$field['field_name']][$delta]['aid'] = array(
            '#type' => 'assetfield',
            '#default_value' => $data['aid'],
            '#attributes' => array('class' => 'asset-cck-'. $return_type),
            '#asset_return_type' => $return_type,
            '#asset_config' => $field['field_name'],
          );
        }
      }
      return $form;

    case 'validate':
      if ($field['required']) {
        if (!count($items)) {
          form_set_error($field['field_name'], $field['widget']['label'] .' is required.');
        }
      }
      return;  

    case 'process form values':
      // Don't save empty fields except the first value
      foreach ($items as $delta => $item) {
        if ($item['aid'] == '' && $delta > 0) {
          unset($items[$delta]);
        }
      }
      break;
  }
}
