<?php
namespace Drupal\asset;

/**
 * Field handler to present a link to the entity.
 */
class asset_views_handler_field_asset_link extends views_handler_field_entity {

  /**
   * Provide appropriate default options for a handler.
   */
  function option_definition() {
    $options = parent::option_definition();
    $options['text'] = array('default' => '', 'translatable' => TRUE);
    return $options;
  }

  /**
   * Provide options form for a handler.
   */
  function options_form(&$form, &$form_state) {
    $form['text'] = array(
      '#type' => 'textfield',
      '#title' => t('Text to display'),
      '#default_value' => $this->options['text'],
    );

    parent::options_form($form, $form_state);

    // The path is set by render_link function so don't allow to set it.
    $form['alter']['path'] = array('#access' => FALSE);
    $form['alter']['external'] = array('#access' => FALSE);
  }

  /**
   * Return HTML.
   */
  function render($values) {
    // @FIXME
// The Assets API has totally changed. CSS, JavaScript, and libraries are now
// attached directly to render arrays using the #attached property.
// 
// 
// @see https://www.drupal.org/node/2169605
// @see https://www.drupal.org/node/2408597
// drupal_add_css(ASSET_MODULE_PATH . '/css/assets-library.css');


    if ($entity = $this->get_value($values)) {
      return $this->render_link($entity, $values);
    }
  }

  /**
   * Basic link builder.
   */
  function render_link($asset, $values) {
    if (asset_access_view_page($asset)) {
      $this->options['alter']['make_link'] = TRUE;
      $this->options['alter']['path'] = "admin/content/assets/view/$asset->aid";
      $text = !empty($this->options['text']) ? $this->options['text'] : t('view');
      return $text;
    }
  }
}
