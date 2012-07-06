<?php

function template_preprocess_asset_wrapper(&$variables) {
  $element = $variables['element'];
  $asset = $element['#entity'];
  $view_mode = $element['#view_mode'];
  $base = 'asset_wrapper';
  $classes_array = $variables['classes_array'];
  $classes_array[] = drupal_html_class('asset');

  if (isset($asset->in_editor) && $asset->in_editor) {
    $classes_array[] = drupal_html_class('editor');
    $base = 'asset_editor_wrapper';
  }
  $classes_array[] = drupal_html_class('asset-' . $element['#bundle']);

  $bundle = strtr($element['#bundle'], '-', '_');
  $variables['theme_hook_suggestions'][] = $base . '__' . $bundle;
  $variables['theme_hook_suggestions'][] = $base . '__' . $bundle . '__' . $view_mode;

  if ($view_mode !== ASSET_DEFAULT_MODE) {
    $options = !empty($asset->asset_options) && is_array($asset->asset_options) ? $asset->asset_options : array();
    if (!empty($options['align']) && in_array($options['align'], array('', 'left', 'right'), TRUE)) {
      $classes_array[] = drupal_html_class('asset-align-' . $options['align']);
    }
  }
  $variables['classes_array'] = $classes_array;
  $variables['attributes_array']['class'] = $classes_array;
  $variables['asset'] = $asset;
  $variables['content'] = $element['#children'];
  $variables['view_mode'] = $view_mode;
}
