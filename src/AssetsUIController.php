<?php
namespace Drupal\asset;

/**
 * UI controller for Asset.
 */
class AssetsUIController extends EntityDefaultUIController {

  /**
   * Overrides hook_menu() defaults.
   */
  public function hook_menu() {
    $items = parent::hook_menu();
    unset($items[$this->path . '/add']);
    return $items;
  }

  public function hook_forms() {
    // The overview and the operation form are implemented by the controller,
    // the callback and validation + submit handlers just invoke the controller.
    $forms[$this->entityType . '_overview_form'] = array(
      'callback' => 'entity_ui_overview_form',
      'wrapper_callback' => 'entity_ui_form_defaults',
    );
    $forms[$this->entityType . '_operation_form'] = array(
      'callback' => 'entity_ui_operation_form',
      'wrapper_callback' => 'entity_ui_form_defaults',
    );

    if (!(count($this->entityInfo['bundles']) == 1 && isset($this->entityInfo['bundles'][$this->entityType]))) {
      foreach ($this->entityInfo['bundles'] as $bundle => $bundle_info) {
        $forms[$this->entityType . '_edit_' . $bundle . '_form']['callback'] = 'asset_base_form';
      }
    }
    return $forms;
  }
}
