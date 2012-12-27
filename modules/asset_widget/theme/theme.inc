<?php
/**
 * @file
 * Module related preprocesses and theme overrides.
 */

/**
 * Preprocess variables for asset-widget-wrapper.tpl.php.
 *
 * @see asset-widget-wrapper.tpl.php
 */
function template_preprocess_asset_widget_wrapper(&$vars) {
  $vars['tab_links'] = array();
  foreach (asset_widget_get_tabs_info() as $tab_id => $info) {
    $classes = array(
      $tab_id . '-tab',
    );

    if (!empty($info['classes'])) {
      $classes = array_merge($classes, $info['classes']);
    }

    $vars['tab_links'][$tab_id] = array(
      'href' => 'javascript:void(0)',
      'title' => '<span class="ico"></span>',
      'external' => TRUE,
      'html' => TRUE,
      'attributes' => array('class' => $classes, 'title' => isset($info['title']) ? t($info['title']) : ''),
    );
  }
  $vars['tabs_count'] = count($vars['tab_links']);

  $vars['loader'] = theme(
    'image',
    array(
      'path' => ASSET_WIDGET_MODULE_PATH . '/images/content/loader.gif' ,
      'attributes' => array(
        'alt' => t('Loading...'),
      ),
    )
  );
}

/**
 * Preprocess variables for asset-widget-edit-buttons.tpl.php.
 *
 * @see asset-widget-edit-buttons.tpl.php
 */
function template_preprocess_asset_widget_edit_buttons(&$vars) {
  if (!empty($vars['asset'])) {
    if ($vars['preview']) {
      $vars['preview_link'] = l(
        '<span class="ico"></span>' . t('Preview'),
        "javascript: void(0)",
        array(
          'html' => TRUE,
          // To leave raw href.
          'external' => TRUE,
        )
      );
    }

    // @todo after applying of custom perms patch, rework it.
    if (user_access('administer assets')) {
      $vars['edit_link'] = l(
        '<span class="ico"></span>' . t('Edit'),
        "admin/content/assets/manage/{$vars['asset']->aid}",
        array(
          'html' => TRUE,
          'attributes' => array(
            'id' => 'aid-' . $vars['asset']->type  . '-' . $vars['asset']->aid,
            'target' => '_blank',
            'class' => 'asset-widget-modify-asset',
          ),
        )
      );
    }
  }
}

/**
 * Preprocess variables for asset-widget-search-filters-block.tpl.php.
 *
 * @see asset-widget-search-filters-block.tpl.php
 */
function template_preprocess_asset_widget_search_filters_block(&$vars) {
  $vars['search_labels'] = array();
  if (!empty($vars['search_params'])) {
    // Provide few links to short mode.
    $vars['search_labels'] = array_slice($vars['search_params'], 0, 3);
  }
}

/**
 * Preprocess variables for asset--widget-search.tpl.php.
 *
 * @see asset--widget-search.tpl.php
 */
function template_preprocess_asset__widget_search(&$vars) {
  // Run preprocesses for default asset types.
  $preprocess = 'template_preprocess_' . $vars['entity_type'] . '__' . $vars['asset']->type . '__' . $vars['view_mode'];
  if (function_exists($preprocess)) {
    $preprocess($vars);
  }

  $vars['buttons'] = theme(
    'asset_widget_edit_buttons',
    array(
      'asset' => $vars['asset'],
      'preview' => $vars['media_field_tooltip'],
    )
  );
}

/**
 * Preprocess variables for asset--image--widget-search.tpl.php.
 *
 * @see asset--image--widget-search.tpl.php
 */
function template_preprocess_asset__image__widget_search(&$vars) {
  $image = field_get_items('asset', $vars['asset'], 'field_asset_image');
  if (!empty($image[0]['uri'])) {
    $vars['media_field'] = theme(
      'image_style',
      array(
        'style_name' => 'asset_image_widget_search',
        'path' => $image[0]['uri'],
      )
    );

    $vars['media_field_tooltip'] = theme(
      'image_style',
      array(
        'style_name' => 'asset_image_widget_search_tooltip',
        'path' => $image[0]['uri'],
      )
    );

    $vars['size'] = t(
      '@width / @height px',
      array(
        '@width' => $image[0]['width'],
        '@height' => $image[0]['height'],
      )
    );
  }

  $description = field_get_items('asset', $vars['asset'], 'field_asset_image_description');
  if (!empty($description[0]['safe_value'])) {
    $vars['description'] = truncate_utf8($description[0]['safe_value'], 140, TRUE, TRUE);
  }

  // @todo: change wrapper for copyright in template.
  $copyright = field_get_items('asset', $vars['asset'], 'field_asset_image_copyright');
  if (!empty($copyright[0]['safe_value'])) {
    $vars['copyright'] = $copyright[0]['safe_value'];
  }
}

/**
 * Preprocess variables for asset--image--widget-search.tpl.php.
 *
 * @see asset--image--widget-search.tpl.php
 */
function template_preprocess_asset__video__widget_search(&$vars) {
  $video = field_get_items('asset', $vars['asset'], 'field_asset_video_file');
  if (!empty($video[0]['snapshot'])) {
    $vars['media_field'] = theme(
      'image',
      array(
        'path' => $video[0]['snapshot'],
      )
    );

    $vars['media_field_tooltip'] = asset_widget_build_video_field_output(NULL, $video);
  }

  $description = field_get_items('asset', $vars['asset'], 'field_asset_video_desc');
  if (!empty($description[0]['safe_value'])) {
    $vars['description'] = truncate_utf8($description[0]['safe_value'], 140, TRUE, TRUE);
  }
}

/**
 * Preprocess variables for asset--image--widget-search.tpl.php.
 *
 * @see asset--image--widget-search.tpl.php
 */
function template_preprocess_asset__audio__widget_search(&$vars) {
}

/**
 * Preprocess variables for asset--image--widget-search.tpl.php.
 *
 * @see asset--image--widget-search.tpl.php
 */
function template_preprocess_asset__document__widget_search(&$vars) {
  $description = field_get_items('asset', $vars['asset'], 'field_asset_document_desc');
  if (!empty($description[0]['safe_value'])) {
    $vars['description'] = truncate_utf8($description[0]['safe_value'], 140, TRUE, TRUE);
  }
}

/**
 * Preprocess variables for asset--image--widget-search.tpl.php.
 *
 * @see asset--image--widget-search.tpl.php
 */
function template_preprocess_asset__free_html__widget_search(&$vars) {
}

/**
 * Preprocess variables for asset--image--widget-search.tpl.php.
 *
 * @see asset--image--widget-search.tpl.php
 */
function template_preprocess_asset__gallery__widget_search(&$vars) {
  // Render first element.
  $image_assets = field_get_items('asset', $vars['asset'], 'field_asset_gallery_images');
  if (!empty($image_assets[0]['target_id']) && ($asset = asset_load($image_assets[0]['target_id']))) {
    $image = field_get_items('asset', $asset, 'field_asset_image');
    if (!empty($image[0]['uri'])) {
      $vars['media_field'] = theme(
        'image_style',
        array(
          'style_name' => 'asset_image_widget_search',
          'path' => $image[0]['uri'],
        )
      );

      $vars['media_field_tooltip'] = theme(
        'image_style',
        array(
          'style_name' => 'asset_image_widget_search_tooltip',
          'path' => $image[0]['uri'],
        )
      );
    }
  }

  $description = field_get_items('asset', $vars['asset'], 'field_asset_gallery_desc');
  if (!empty($description[0]['safe_value'])) {
    $vars['description'] = truncate_utf8($description[0]['safe_value'], 140, TRUE, TRUE);
  }
}

/**
 * Preprocess variables for asset-widget-asset-form-page.tpl.php.
 * @see asset-widget-asset-form-page.tpl.php
 */
function template_preprocess_asset_widget_asset_form_page(&$vars) {
  $vars['title'] = drupal_get_title();
  $vars['messages'] = $vars['page']['#show_messages'] ? theme('status_messages') : '';
}
