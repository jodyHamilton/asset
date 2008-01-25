<?php
// $Id$

/**
* @file
* short description...
*
* long description...
*/

function asset_embed_youtube_info(){
  return array('name' => 'YouTube');
}

function asset_embed_youtube_settings(){
  $form = array();
  return $form;
}

function asset_embed_youtube_extract_id($text){
  $matches = array();
  // first try to match the embed tag
  preg_match('/param[^>]*value=\"http:\/\/www.youtube.com\/v\/([a-zA-Z0-9]*)/',$text,$matches);
  
  // then the URL
  if(!isset($matches[1])){
    // http://youtube.com/watch?v=9193duFdUec
//    preg_match('/http:\/\/www.youtube.com\/watch\?v=([a-zA-Z0-9]*)^\"/',$text,$matches);
    preg_match('/\?v=([^"&]*)/',$text,$matches);
  }    
  return (isset($matches[1]) ? array('id' => $matches[1]) : false);
}

function asset_embed_youtube_thumbnail_src($asset, $attr = array()){
  $id = $asset->embed['id'];
  $img = $attr['thumbnail'] ? $attr['thumbnail'] : 'default';
  $url = "http://img.youtube.com/vi/$id/$img.jpg";
  return $url;
}

function theme_asset_embed_youtube_thumbnail($asset, $attr = array()){
  $url = asset_embed_youtube_thumbnail_src($asset, $attr);
  $alt = $title = $asset->title;
  $img = '<img src="'. check_url($url) .'" alt="'. check_plain($alt) .'" title="'. check_plain($title) .'" />';      
  return $img;
}

function theme_asset_embed_youtube_fullsize($asset, $attr = array()){
  $id = $asset->embed['id'];
  $width = $attr['width'] ? $attr['width'] : 425; 
  $height = $attr['height'] ? $attr['height'] : 355; 
  
  return '<object width="'. $width .'" height="'. $height .'">'
       . '<param name="movie" value="http://www.youtube.com/v/'.$id.'"></param>'
       . '<param name="wmode" value="transparent"></param>'
       . '<embed src="http://www.youtube.com/v/'.$id.'" type="application/x-shockwave-flash" '
       . 'wmode="transparent" width="'. $width .'" height="'. $height .'">'
       . '</embed></object>';
}

function asset_embed_youtube_form($asset, $attr){
  $form = array();
  switch($attr['format']){
    case 'fullsize':
      $form['width'] = array(
        '#type' => 'textfield',
        '#title' => t('Width'), 
        '#default_value' => 425,
      );
      $form['height'] = array(
        '#type' => 'textfield',
        '#title' => t('Height'), 
        '#default_value' => 355,
      );
      break;
    case 'thumbnail':
      $form['thumbnail'] = array(
        '#type' => 'radios',
        '#title' => t('Select an image'),
        '#options' => array(
          1 => theme('asset_embed_youtube_thumbnail', $asset, array('thumbnail' => 1)),
          2 => theme('asset_embed_youtube_thumbnail', $asset, array('thumbnail' => 2)),
          3 => theme('asset_embed_youtube_thumbnail', $asset, array('thumbnail' => 3)),
        ),
        '#default_value' => 1,
        '#weight' => -1,
      );      
      break;
  }
  return $form;
}