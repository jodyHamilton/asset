<?php

/**
 * Implementation of hook_provider_asset_search().
 */
function video_cck_google_asset_search($op = 'info', $type = NULL, $a3 = NULL) {
  switch($op){
    case 'info':
      $types['video_cck_google_search'] = array(
        'type' => 'video_cck_google_search',
        'name' => t('Google Video Search'),
        'module' => 'asset_emfield', 
        'emfield_provider' => 'google',
      );
      return $types;

    case 'url':
      $value = urlencode($a3);
      switch($type['type']){
        case 'video_cck_google_search':
        default:
          return 'http://video.google.com/videofeed?type=search&q='. $value .'+site%3Avideo.google.com&so=0&num=20&output=rss';
      }
      break;

    case 'feed item':
      $asset = $a3;
      $asset->type = 'emfield_video';
      $asset->emfield = array(0 => array('embed' => $asset->guid));
      $asset->formatters = asset_get_formatters($asset);
      asset_emfield_invoke('submit', $asset);
      
      return $asset;
  }
}
