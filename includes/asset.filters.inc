<?php
/**
 * @file
 * Assets Input filters logic.
 */

/**
 * Renders asset with overridden optional fields
 */
function assets_render_by_tag($asset, $params_string, $in_editor = FALSE) {
  if (!empty($asset)) {
    $clone = clone($asset);
    $clone->in_editor = $in_editor;
    $params_string = html_entity_decode($params_string, ENT_COMPAT, 'UTF-8');
    $params_string = html_entity_decode($params_string, ENT_COMPAT, 'UTF-8');
    $options = json_decode('{' . $params_string . '}', TRUE);
    $view_mode = ASSET_DEFAULT_MODE;
    if (is_array($options)) {
      foreach ($options as $name => $value) {
        if ($name == 'mode') {
          $view_mode = $value;
        }
        elseif ($name == 'align') {
          $asset->align = $value;
        }
        else {
          _assets_set_field_value($clone, $name, $value);
        }
      }
    }
    $clone->asset_options = $options;
    $clone->asset_source_string = $params_string;
    return render($clone->view($view_mode));
  }
  return '';
}

/**
 * Helper function to keep the initial regexp only here
 * returns a set of matches per asset tag
 */
function assets_filter_get_matches($text) {
  $matches = array();
  preg_match_all('/\\[\\[asset:([_a-zA-Z0-9]+):([0-9]+)\\s\\{((\\n|.)*?)\\}\\]\\]/s', $text, $matches, PREG_SET_ORDER);
  return $matches;
}

/**
 * Filter callback for assets markup filter.
 */
function assets_filter_process($text) {
  $text = preg_replace_callback(
    '/\\[\\[asset:([_a-zA-Z0-9]+):([0-9]+)\\s\\{((\\n|.)*?)\\}\\]\\]/s',
    'assets_filter_replace_process',
    $text
  );

  return $text;
}

/**
 * Filter callback for remove assets filter.
 */
function assets_cut_filter_process($text) {
  $matches = assets_filter_get_matches($text);
  $tags = array();
  foreach ($matches as $match) {
    $tags[] = $match[0];
  }
  if (count($tags)) {
    $text = str_replace($tags, '', $text);
  }
  return $text;
}

/**
 * Filter callback for assets_filter_process.
 */
function assets_filter_replace_process($matches) {
  if (!empty($matches[2]) && !empty($matches[1])
    && !empty($matches[3])) {
    $asset = asset_load($matches[2]);
    $rendered = assets_render_by_tag($asset, $matches[3]);

    return $rendered;
  }

  return $matches[0];
}

/**
 * Helper function to override the optional asset field values
 *
 * @param type $asset Asset entity
 * @param type $field Field the new value will be applied to
 * @param type $values Values to set for the given asset field
 *
 */
function _assets_set_field_value(&$asset, $field_name, $values) {
  $values = (array) $values;
  $types_we_handle = _assets_get_overridable_fields($asset->type);

  if (isset($types_we_handle[$field_name])) {
    if (!count($values)) {
      $values = array('');
    }
    //if (count($values)) {
      $langcode = field_language('asset', $asset, $field_name);
      if (!$langcode) {
        $langcode = LANGUAGE_NONE;
      }
      $field_type = $types_we_handle[$field_name]['type'];
      switch ($field_type) { //should we check the type of widget instead?
        case 'text':
        case 'text_long':
          if (!isset($asset->{$field_name}[$langcode])) {
            $asset->{$field_name}[$langcode] = array();
          }
          foreach ($values as $delta => $value) {
            $value = html_entity_decode($value, ENT_NOQUOTES, 'UTF-8');
            if (!isset($asset->{$field_name}[$langcode][$delta])) {
              $asset->{$field_name}[$langcode][$delta] = array();
            }
            if (isset($asset->{$field_name}[$langcode][$delta]['format']) && $asset->{$field_name}[$langcode][$delta]['format']) {
              $safe_value = check_markup($value, $asset->{$field_name}[$langcode][$delta]['format']);
            }
            else {
              $safe_value = check_plain($value);
            }
            $asset->{$field_name}[$langcode][$delta]['value'] = $value;
            $asset->{$field_name}[$langcode][$delta]['safe'] = $safe_value;
            $asset->{$field_name}[$langcode][$delta]['safe_value'] = $value;
          }
          break;
/*
        case 'link_field':
          foreach ($values as $delta => $value) {
            if ($value === 'EMPTY') {
              $value = '';
            }
            if (!isset($asset->{$field_name}[$langcode][$delta])) {
              $asset->{$field_name}[$langcode][$delta] = array();
            }
            $asset->{$field_name}[$langcode][$delta]['url'] = $value;
          }
          break;*/
      }
    //}
  }
}
