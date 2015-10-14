<?php
namespace Drupal\asset;

/**
 * Use a separate class for asset types so we can specify some defaults.
 */
class AssetType extends Entity {

  public $type;
  public $name;
  public $icon;
  public $description;
  public $help;
  public $weight = 0;

  public function __construct($values = array()) {
    parent::__construct($values, 'asset_type');
  }

  /**
   * Returns whether the asset type is locked, thus may not be deleted or renamed.
   *
   * Asset types provided in code are automatically treated as locked,
   * as well as any fixed asset type.
   */
  public function isLocked() {
    return isset($this->status) && empty($this->is_new) && (($this->status & ENTITY_IN_CODE) || ($this->status & ENTITY_FIXED));
  }

  /**
   * Delete function.
   *
   * We have to override this method just to invoke the entity_defaults_rebuild,
   * in case when no existent types were reverted
   *
   * @param $ids
   * @param DatabaseTransaction | null $transaction
   */
  public function delete() {
    parent::delete();
    entity_defaults_rebuild(array($this->entityType));
  }
}
