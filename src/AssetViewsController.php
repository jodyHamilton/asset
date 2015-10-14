<?php
namespace Drupal\asset;

class AssetViewsController extends EntityDefaultViewsController  {

  /**
   * Alternative for hook_views_data().
   */
  public function views_data() {
    $data = parent::views_data();
    $table = $this->info['base table'];

    $data[$table]['aid'] = array(
      'title' => t('Aid'),
      'help' => t('The asset ID.'),
      'field' => array(
        'handler' => 'asset_views_handler_field_asset',
        'click sortable' => TRUE,
      ),
      'argument' => array(
        'handler' => 'asset_views_handler_argument_asset_aid',
        'name field' => 'title',
        'numeric' => TRUE,
        'validate type' => 'aid',
      ),
      'filter' => array(
        'handler' => 'views_handler_filter_numeric',
      ),
      'sort' => array(
        'handler' => 'views_handler_sort',
      ),
    );

    $data[$table]['title'] = array(
      'title' => t('Title'),
      'help' => t('The asset title.'),
      'field' => array(
        'handler' => 'asset_views_handler_field_asset',
        'click sortable' => TRUE,
        'link_to_asset default' => TRUE,
      ),
      'sort' => array(
        'handler' => 'views_handler_sort',
      ),
      'filter' => array(
        'handler' => 'views_handler_filter_string',
      ),
      'argument' => array(
        'handler' => 'views_handler_argument_string',
      ),
    );

    // Set proper filter handler to allow autocomplete on field.
    $data[$table]['uid']['filter']['handler'] = 'views_handler_filter_user_name';
    $data[$table]['edit_asset'] = array(
      'field' => array(
        'title' => t('Edit link'),
        'help' => t('Provide a simple link to edit the asset.'),
        'handler' => 'asset_views_handler_field_asset_link_edit',
      ),
    );

    $data[$table]['delete_asset'] = array(
      'field' => array(
        'title' => t('Delete link'),
        'help' => t('Provide a simple link to delete the asset.'),
        'handler' => 'asset_views_handler_field_asset_link_delete',
      ),
    );

    $data[$table]['insert_asset'] = array(
      'field' => array(
        'title' => t('Insert button'),
        'help' => t('Provide a button for assets library.'),
        'handler' => 'asset_views_handler_field_asset_link_insert',
      ),
    );

    return $data;
  }
}
