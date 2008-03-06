<?php

/**
 * Implementation of hook_provider_asset_search().
 */
function video_cck_youtube_asset_search($op = 'info', $type = NULL, $a3 = NULL) {
  switch($op){
    case 'info':
      $types['video_cck_youtube_user'] = array(
        'type' => 'video_cck_youtube_user',
        'name' => t('YouTube username'),
        'module' => 'asset_emfield', 
      	'group' => t('YouTube Search'),
        'emfield_provider' => 'youtube',
      );
      $types['video_cck_youtube_tag'] = array(
        'type' => 'video_cck_youtube_tag',
        'name' => t('YouTube tag'),
        'module' => 'asset_emfield', 
      	'group' => t('YouTube Search'),
        'emfield_provider' => 'youtube',
      );
      return $types;

    case 'url':
      $value = urlencode($a3);
      switch($type['type']){
        case 'video_cck_youtube_user':
          return 'http://www.youtube.com/rss/user/'. $value .'/videos.rss';
        case 'video_cck_youtube_tag':
        default:
          return 'http://www.youtube.com/rss/tag/'. $value .'.rss';
      }
      break;
      
    case 'feed item':
      $asset = $a3;
      $asset->type = 'emfield_video';
      $asset->emfield = array(0 => array('embed' => $asset->link));
      $asset->formatters = asset_get_formatters($asset);
      asset_emfield_invoke('submit', $asset);
      
      return $asset;
  }
}
