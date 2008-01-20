<?php
// $Id$

/**
* @file
* short description...
*
* long description...
*/

/**
 * Implementation of hook_asset_type('load') for file asset type
 */
function asset_file_load($asset){
  $files = array();
  $result = db_query('SELECT f.*, a.label FROM {files} f INNER JOIN {asset_files} a ON f.fid=a.fid WHERE a.aid=%d', $asset->aid);
  while($row = db_fetch_array($result)){
    if($row['label'] == 'default'){
      $default = $row;
    }
    $files[$row['label']] = $row;
  }
  return array('file' => $default, 'files' => $files);
}

/**
 * Implementation of hook_asset_type('view') for file asset type
 */
function asset_file_view($asset){
  if(strpos($asset->file['filemime'], 'image/') === 0){
    return theme('image', file_create_path($asset->file['filepath']), $asset->title, $asset->title);
  }
  else{
    return l($asset->file['filename'], file_create_url($asset->file['filepath']));
  }
}

/**
 * Implementation of hook_asset_type('form') for file asset type
 */
function asset_file_form($asset){
  if($asset->file['fid']){
    $form['_upload'] = array(
      '#type' => 'item', 
      '#value' => $asset->file['filename'],
      '#title' => t('Current file'),
    );
    $overwrite = t('This will replace any files that have been uploaded previously.');
  }
  $form['upload'] = array(
    '#type' => 'file', 
    '#title' => t('Attach new file'),
    '#description' => $overwrite ? $overwrite : NULL,
  );
  
  if($options = _asset_file_localfile_options()){
    $form['localfile'] = array(
      '#type' => 'select',
      '#title' => t('Or select a file'),
      '#options' => $options,
    );
  }
  
  $form['#attributes']['enctype'] = 'multipart/form-data';
  return $form;
}

function _asset_file_localfile_options($ext = FALSE){
  if($dir = variable_get('asset_ftp_dir', '')){
    $options = array('#' => t('-- Select a file --'));
    $regex = $ext ? '.*\.'. $ext : '.*';
    foreach(file_scan_directory($dir, $regex) as $file){
      $path = str_replace($dir, '', $file->filename);
      $options[$path] = $path;
    }
    asort($options);
  }  
  else{
    $options = FALSE;
  }
  
  return $options;
}

/**
 * Implementation of hook_asset_type('validate') for file asset type
 */
function asset_file_validate($asset){
  if(!$asset->aid && !file_check_upload('upload')){
    $ftp = variable_get('asset_ftp_dir', ''); 
    // if ftp uploads are allowed and no localfile was selected
    if($ftp && $asset->localfile == '#'){
      form_set_error('upload', t('You must upload a file or select one from the list.'));
    }
    // no ftp and no upload 
    elseif(!$ftp){
      form_set_error('upload', t('You must upload a file.'));
    }
  }
}

/**
 * Implementation of hook_asset_type('insert') for file asset type
 */
function asset_file_insert(&$asset){
  $file = file_check_upload('upload');
  $asset_path = variable_get('asset_file_directory_path', '');
  $dest = $asset_path ? $asset_path .'/'. $file->filename : $file->filename;
  if ($file = file_save_upload($file, $dest)) {
    $file->fid = db_next_id('{files}_fid');
    db_query("INSERT INTO {files} (fid, nid, filename, filepath, filemime, filesize) VALUES (%d, %d, '%s', '%s', '%s', %d)", $file->fid, 0, $file->filename, $file->filepath, $file->filemime, $file->filesize);
    db_query("INSERT INTO {asset_files} (aid, fid, label) VALUES (%d, %d, '%s')", $asset->aid, $file->fid, 'default');
  }
  elseif($asset->localfile){
    $path = variable_get('asset_ftp_dir', '') . $asset->localfile;
    $asset_path = variable_get('asset_file_directory_path', '');
    $dest = $asset_path ? $asset_path .'/'. basename($path) : basename($path);
    
    // prepare the file object. based on file_check_upload
    // Begin building file object.
    $file = new stdClass();
    $file->filename = trim(basename($path), '.');
    $file->filepath = $path;
    $file->filemime = mime_content_type($path);
    $file->filesize = filesize($path);

    // Rename potentially executable files, to help prevent exploits.
    if (preg_match('/\.(php|pl|py|cgi|asp|js)$/i', $file->filename) && (substr($file->filename, -4) != '.txt')) {
      $file->filemime = 'text/plain';
      $file->filepath .= '.txt';
      $file->filename .= '.txt';
    }

    if(file_move($file, $dest)){
      $file->fid = db_next_id('{files}_fid');
      db_query("INSERT INTO {files} (fid, nid, filename, filepath, filemime, filesize) VALUES (%d, %d, '%s', '%s', '%s', %d)", $file->fid, 0, $file->filename, $file->filepath, $file->filemime, $file->filesize);
      db_query("INSERT INTO {asset_files} (aid, fid, label) VALUES (%d, %d, '%s')", $asset->aid, $file->fid, 'default');
    }
  }
  $asset->file = db_fetch_array(db_query('SELECT f.* FROM {files} f INNER JOIN {asset_files} a ON f.fid=a.fid WHERE a.aid=%d', $asset->aid));
}

function _asset_file_insert_localfile($localfile){
  $path = variable_get('asset_ftp_dir', '') . $localfile;
  $asset_path = variable_get('asset_file_directory_path', '');
  $dest = $asset_path ? $asset_path .'/'. basename($path) : basename($path);
  
  // prepare the file object. based on file_check_upload
  // Begin building file object.
  $file = new stdClass();
  $file->filename = trim(basename($path), '.');
  $file->filepath = $path;
  $file->filemime = mime_content_type($path);
  $file->filesize = filesize($path);

  // Rename potentially executable files, to help prevent exploits.
  if (preg_match('/\.(php|pl|py|cgi|asp|js)$/i', $file->filename) && (substr($file->filename, -4) != '.txt')) {
    $file->filemime = 'text/plain';
    $file->filepath .= '.txt';
    $file->filename .= '.txt';
  }

  if(file_move($file, $dest)){
    $file->fid = db_next_id('{files}_fid');
    db_query("INSERT INTO {files} (fid, nid, filename, filepath, filemime, filesize) VALUES (%d, %d, '%s', '%s', '%s', %d)", $file->fid, 0, $file->filename, $file->filepath, $file->filemime, $file->filesize);
    db_query("INSERT INTO {asset_files} (aid, fid) VALUES (%d, %d)", $asset->aid, $file->fid);
    return $file;
  }
  else{
    return false;
  }
}

/**
 * Implementation of hook_asset_type('update') for file asset type
 */
function asset_file_update(&$asset){
  $file = file_check_upload('upload');
  $asset_path = variable_get('asset_file_directory_path', '');
  $dest = $asset_path ? $asset_path .'/'. $file->filename : $file->filename;
  if ($file = file_save_upload($file, $dest)) {
    $file->fid = db_next_id('{files}_fid');
    // delete the old file and remove db entry
    file_delete($asset->file['filepath']);
    db_query("DELETE FROM {files} WHERE fid=%d", $asset->file['fid']);
    // add the new file and update the relationship
    db_query("INSERT INTO {files} (fid, nid, filename, filepath, filemime, filesize) VALUES (%d, %d, '%s', '%s', '%s', %d)", $file->fid, 0, $file->filename, $file->filepath, $file->filemime, $file->filesize);
    db_query("UPDATE {asset_files} SET fid=%d WHERE aid=%d", $file->fid, $asset->aid);
  }
}

/**
 * Implementation of hook_asset_type('delete') for file asset type
 */
function asset_file_delete($asset){
  file_delete($asset->file['filepath']);
  db_query("DELETE FROM {files} WHERE fid=%d", $asset->file['fid']);
  db_query("DELETE FROM {asset_files} WHERE aid=%d", $asset->aid);  
}

/**
 * Implementation of hook_asset_type('icon') for file asset type
 */
function asset_file_icon($asset){
  if(strpos($asset->file['filemime'], 'image/') === 0){
    $format = variable_get('asset_file_image_icon', 'default');
    if($format == 'default'){
      return file_create_path($asset->file['filepath']);
    }
    else{
      return file_directory_path() .'/imagecache/'. $format .'/'. $asset->file['filepath'];
    }
  }
  $path = pathinfo($asset->file['filepath']);
  $icon = drupal_get_path('module', 'asset') . '/icons/' . $path['extension'] . '.png';
  if (file_exists($icon)) {
    return $icon;
  }
}

/**
 * Implementation of hook_asset_type('img') for file asset type
 */
function asset_file_img($asset){
  if(strpos($asset->file['filemime'], 'image/') === 0){
    return file_create_path($asset->file['filepath']);
  }
  $path = pathinfo($asset->file['filepath']);
  $icon = drupal_get_path('module', 'asset') . '/icons/' . $path['extension'] . '.png';
  if (file_exists($icon)) {
    return $icon;
  }
}

/**
 * Implementation of hook_asset_type('view') for directory asset type
 */
function asset_directory_view($asset){
  $items = array();
  if($asset->aid){
    $parent = asset_load($asset->pid);
    $parent->link_title = '..';
    $items[] = $parent;
  }
  $result = db_query('SELECT a.*, (a.type = "directory") as directory FROM {asset} a WHERE a.pid=%d ORDER BY directory DESC, a.title', $asset->aid);
  while($row = db_fetch_object($result)){
    $a = asset_load($row->aid);
    $items[] = $a;
  }
  return theme('asset_directory_browse', $items);  
}

function theme_asset_directory_browse($items = array()){
  $size = 64;
  $links = array();
  foreach($items as $asset){
    $icon = theme('asset_icon', $asset, $size);
    $links[] = tbl($icon, 'asset/'. $asset->aid, array(), NULL, NULL, FALSE, TRUE);
  }
  $output .= '<ul class="asset-directory-browse clear-block">';
  foreach($links as $link){
    $output .= '<li>'. $link .'</li>';
  }
  $output .= '</ul>';
  return $output;
}

/**
 * Implementation of hook_asset_type('icon') for directory asset type
 */
function asset_directory_icon($asset){
  $icon = drupal_get_path('module', 'asset') . '/icons/folder.png';
  if (file_exists($icon)) {
    return $icon;
  }
}

if(!function_exists('mime_content_type ')) {
  function mime_content_type($filename) {
    $ext = strtolower(array_pop(explode('.',$filename)));
    $types = array(
      'gif' => 'image/gif',
      'png' => 'image/png',
      'jpg' => 'image/jpeg',
      'jpeg' => 'image/jpeg',
      'mpeg' => 'video/mpeg',
      'mov' => 'video/quicktime',
      'avi' => 'video/x-msvideo',
      'flv' => 'video/x-flv',
    );
    
    $mimetype = $types[$ext] ? $types[$ext] : 'text/plain';
    return $mimetype;     
  }
}

