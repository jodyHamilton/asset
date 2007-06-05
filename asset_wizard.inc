<?php

//TODO: Clean this file up majorly!
//TODO: Provide credit to wizard example. http://www.pre-emptive.net/node/21

define('ASSET_WIZARD_NEXT', 'Next');
define('ASSET_WIZARD_PREVIOUS', 'Back');
define('ASSET_WIZARD_CANCEL', 'Cancel');

// Set how many steps in this wizard.
define('ASSET_WIZARD_FINAL_STEP', 4);

// When finishing the wizard (or cancelling it), this defines where
// the browser ends up going.
define('ASSET_WIZARD_FINISH_REDIRECT', 'node');


/**
 * Much trimmed down version of theme_page();
 */
function theme_asset_popup($content){
  $title = drupal_get_title();
  $styles = drupal_get_css();
  $scripts = drupal_get_js();
  $head = drupal_get_html_head();
  $messages = theme('status_messages');
  return <<<POPUP
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="<?php print $language ?>" xml:lang="<?php print $language ?>">
<head>
  <title>$title</title>
  $head
  $styles
  $scripts
</head>
<body id="asset-popup">
  <h1>$title</h1>
  $messages
  <div class="content">$content</div>
</body>
</html>
POPUP;

}
  
function asset_tree_widget($current_asset = NULL){
  // set directory
  $dir = file_create_path($current_asset->dirname ? $current_asset->dirname : $_GET['dir']);
  
  // create directory crumbs and '..' entry
  $crumbs = array();
  if($dir != file_directory_path()){
    $parts = explode('/',str_replace(file_directory_path().'/','',$dir));
    while($current = array_pop($parts)){
      $dir_arg = $parts ? join('/',$parts).'/'.$current : $current;
      $crumbs[] = l($current,$_GET['q'],array(),'dir='.$dir_arg);
    }
    $parent_dir = substr($dir, 0, strrpos($dir,'/'));
    $list = '<li class="parent">'.l('..',$_GET['q'],array(),'dir='.$parent_dir).'</li>';
  }
  $crumbs[] = l('assets',$_GET['q']);

  // copy querystring args for building links 
  $query = $_GET;
  unset($query['q']);
  
  // build directory list and filename options array
  $result = db_query('SELECT aid FROM {asset} WHERE dirname="%s"',$dir);
  $options = array();
  while($asset = db_fetch_object($result)){
    $asset = asset_load($asset->aid);
    if(asset_access($asset)){      
      // add to list if directory or add to options if file
      if($asset->extension == ''){
        $query['dir'] = $asset->filepath;
        $list  .= '<li class="folder">'.l($asset->filename,$_GET['q'],array(),asset_build_query($query)).'</li>';
      }else{
        $options[$asset->aid] = $asset->filename;
      }
    }   
  } 

  $form[] = array('#value' => '<div class="breadcrumb">/ '.join(' / ',array_reverse($crumbs)).'</div>');
  if($list){
    $form[] = array('#value' =>  '<ul>'.$list.'</ul>');
  }
  $form['aid'] = array(
    '#type' => 'select',
    '#size' => 10,
    '#options' => $options,
  );
  if($current_asset->aid){
    $form['aid']['#default_value'] = $current_asset->aid;
  }
  $form[] = array('#value' => '<div class="asset-preview"></div>');
  $form['#prefix'] = '<div class="asset-tree-widget clear-block">';
  $form['#suffix'] = '</div>';
  $form['#tree'] = false;

  return $form;
}

function asset_build_query($data){
  foreach($data as $k=>$v){
    $items[] = "$k=$v";
  }
  return join('&',$items);
}

function asset_wizard_form($form_values = null){
  // Allow the aid to be passed in the querystring
  if($form_values == null && is_numeric($_GET['aid'])){
    $form_values['step'] = 2;
    $form_values['aid'] = $_GET['aid'];
  }
  
  // Step Handling
  if (!isset($form_values)) {
      $step = 1;
  } else {
    switch($form_values['op']){
      case t('Back'):
        $step = $form_values['step'] > 1 ? $form_values['step'] - 1 : 1;
        break;
      case t('Next'):
      case t('Finish'):
        if($step == 1 && !$form_values['aid']){
          // dont proceed without a valid aid.
          break;
        }
        $step = $form_values['step'] + 1;
        break;
      default:
        // only back,next,finish buttons should effect the step
        $step = $form_values['step'];
        break;
    }
  }
  $form['step'] = array('#type' => 'hidden', '#value' => $step);
  drupal_set_title("Asset Wizard - Step $step");

  // Extract asset info from the macro or aid
  if($form_values['macro']){
    $macros = asset_get_macros(' '.$form_values['macro'].' ');
    $macro = array_pop($macros);
    if($macro['aid']){
      $asset = asset_load($macro['aid']);
    }
  }elseif($form_values['aid']){
    $asset = asset_load($form_values['aid']);
    $macro['aid'] = $form_values['aid'];
  }
  if(is_object($asset) && $step > 1){
    $form[] = array('#value'=>'<div class="asset-selected-preview">'.asset_js_preview($asset->aid,false,true).'</div>');    
  }

  // Build the form based on what step we are on
  switch($step) {
    case 1:
      asset_wizard_form_asset_selection($form, $form_values, $asset);
      break;
    case 2:
      $form['macro'] = array('#type'=>'hidden', '#value' => asset_build_macro($macro));
      $form['help'] = array('#value' => t('Please select a formatting option.'));
      $formatters = asset_get_formatters();
      $ext = strtolower($asset->extension);
      $default = variable_get('asset_default_formatter_' . $asset->type . '_' . $ext, 'asset:link');
      if (is_array($formatters[$asset->type][$ext])) {
        foreach ($formatters[$asset->type][$ext] as $formatter) {
          $form['formatter'][] = array(
            '#type' => 'radio',
            '#title' => $formatter['name'],
            '#return_value' => $formatter['module'].':'.$formatter['format'],
            '#default_value' => $default,
            '#description' => $formatter['description'] ? $formatter['description'] : NULL,
            '#parents' => array('formatter'),
          );
        }
      }
      if (is_array($formatters[$asset->type]['*'])) {
        foreach ($formatters[$asset->type]['*'] as $formatter) {
          $form['formatter'][] = array(
            '#type' => 'radio',
            '#title' => $formatter['name'],
            '#return_value' => $formatter['module'].':'.$formatter['format'],
            '#description' => $formatter['description'] ? $formatter['description'] : NULL,
            '#parents' => array('formatter'),
          );
        }
      }
      if (is_array($formatters['*']['*'])) {
        foreach ($formatters['*']['*'] as $formatter) {
          $form['formatter'][] = array(
            '#type' => 'radio',
            '#title' => $formatter['name'],
            '#return_value' => $formatter['module'].':'.$formatter['format'],
            '#description' => $formatter['description'] ? $formatter['description'] : NULL,
            '#parents' => array('formatter'),
          );
        }
      }

      
      break;
    case 3:
      list($macro['formatter'],$macro['format']) = explode(':',$form_values['formatter']);
      $form['macro'] = array(
        '#type'=>'hidden', 
        '#value' => asset_build_macro($macro),
      );
      $default_options['title'] = array(
        '#type' => 'textfield',
        '#title' => t('Title'),
        '#default_value' => $asset->title,
        '#size' => 40,
      );
      $default_options['width'] = array(
        '#type' => 'textfield',
        '#title' => t('Width'),
        '#default_value' => $asset->height,
      );
      $default_options['height'] = array(
        '#type' => 'textfield',
        '#title' => t('Height'),
        '#default_value' => $asset->width,
      );
      $default_options['align'] = array(
        '#type' => 'select',
        '#title' => t('Alignment'),
        '#options' => array(
          'none' => t('None'),
          'left' => t('Left'),
          'center' => t('Center'),
          'right' => t('Right'),
        ),
        '#default_value' => 'none',
      );
      $module_options = (array)module_invoke($macro['formatter'],'asset_formatter','options',$asset,$macro);
      $form['options'] = array_merge($default_options, $module_options);
      $form['options']['#tree'] = true;
      break;
      
    case 4:
      if(is_array($form_values['options'])){
        foreach($form_values['options'] as $k => $v){
          if(!in_array($k, array('aid','formatter','format')) && $v){
            $macro[$k] = $v;
          }
        }
      }
      $form['macro'] = array(
        '#type'=>'textarea',
        '#title'=>'Paste the following code into your text.',
        '#value'=>asset_build_macro($macro),
      );
      $form[] = array('#value' => asset_wizard_finish());
      break;
  }
  
  // This is important. If we're on the final step, we tell drupal to use the 
  // normal redirect functionality. That means the browser goes to whatever page
  // after the final submit. All previous steps don't redirect, so just post 
  // back to this form.
  $form['#redirect'] = ($step == ASSET_WIZARD_FINAL_STEP) ? NULL : FALSE;
  $form['#multistep'] = TRUE;
  $form['#tree'] = TRUE;

  $form['footer']['#tree'] = false;
  $form['footer']['cancel'] = array(
    '#type' => 'submit',
    '#value' => t(ASSET_WIZARD_CANCEL),
    '#attributes' => array('alt' => t('Cancel and Return')),
  );
  $form['footer']['previous'] = array(
    '#type' => 'submit',
    '#value' => t(ASSET_WIZARD_PREVIOUS),
    '#attributes' => (isset($form_values['op']) || $step > 1 ? array() : array('disabled'=>'disabled'))
  );
  if($step == ASSET_WIZARD_FINAL_STEP - 1){
    $form['footer']['finish'] = array(
      '#type' => 'submit',
      '#value' => t('Finish'),
     );
  }else{
    $form['footer']['next'] = array(
      '#type' => 'submit',
      '#value' => t(ASSET_WIZARD_NEXT),
    );
  }

  return $form;
}

function asset_asset_type($op = 'info', $delta = 0, $form_values=array()){
  switch($op){
    case 'info':
      return array(
        'upload' => array(
          'value' => t('Asset Upload'),
          'title' => t('Upload a new file.'),
          'src' => drupal_get_path('module','asset').'/lullacons/doc-option-add.png',
        ),
      );
    case 'form':
      $form['module'] = array('#type'=>'value', '#value'=>'asset');
      $form['parent'] = array(
        '#type' => 'hidden',
        '#value' => file_create_path($form_values['parent'] ? $form_values['parent'] : $_GET['dir']),
      );
      $form[] = array(
        '#type' => 'item',
        '#title' => 'Directory',
        '#value' => str_replace(file_directory_path(),'assets',$form['parent']['#value']),
        '#prefix' => '<div class="container-inline">',
        '#suffix' => '</div>',
      );
      $form['upload'] = array(
        '#type' => 'file',
        '#title' => t('New File'),
        '#size' => 35,
      );
      $form['title'] = array(
        '#type' => 'textfield',
        '#title' => t('Title'),
      );
      $form['author'] = array(
        '#type' => 'textfield',
        '#title' => t('Author'),
      );
      $form['description'] = array(
        '#type' => 'textarea',
        '#title' => t('Description'),
        '#rows' => 3,
      );
      $form['status'] = array(
        '#type' => 'radios',
        '#title' => t('Status'),
        '#required' => true,
        '#default_value' => ASSET_PUBLIC,
        '#options' => array(
          ASSET_PRIVATE => t('Private'),
          ASSET_PUBLIC => t('Public'),
        ),
      );
      $form['#attributes']['enctype'] = 'multipart/form-data';
      return $form;
    case 'validate':
      // must return a valid asset aid
      if($file = file_check_upload('upload')){
        $path = file_create_path($form_values['parent'].'/'.$file->filename);
        if($file = file_save_upload('upload', $path)){
          $file->status = $form_values['status']; 
          $file->title = $form_values['title'];
          $file->author = $form_values['author'];
          $file->description = $form_values['description'];
          $asset = asset_save($file);
          return $asset->aid;
        }else{
          form_set_error('upload','Error saving file to <em>'.$path.'</em>');
        }
      }else{
        form_set_error('upload','Error uploading file</em>');
      }
      break;
    case 'submit':
      break;
  }
      
}

function asset_wizard_form_asset_selection(&$form, &$form_values, $asset=NULL){
  global $user;
  static $types, $ops;
  
  if(!isset($types)){
    foreach(module_implements('asset_type') as $module){
      $types[$module] = module_invoke($module, 'asset_type', 'info');
      foreach($types[$module] as $delta=>$type){
        $ops[$type['value']] = array('module'=>$module,'delta'=>$delta);
      } 
    }
  }
  
  $op = false;
  if($form_values['op'] == t('Back')){
    // if a user got here by clicking back, then they are trying to get to the
    // main selection screen. 
    $op = false;
  }else if(isset($form_values['op']) && isset($ops[$form_values['op']])){
    $op = $form_values['op'];
  }else if($ops[$_GET['op']]){
    $op = $_GET['op'];
    // unset op, so that links that re-use the query string wont use it again.
    unset($_GET['op']);
  }
  
  if($op){
    $module = $ops[$op]['module'];
    $delta = $ops[$op]['delta'];
    $form = array_merge($form, module_invoke($module, 'asset_type', 'form', $delta, $form_values));
    $form['module'] = array('#type'=>'value', '#value'=>$module);
    $form['delta'] = array('#type'=>'value', '#value'=>$delta);
  }else{
    // normal asset selection form
    $form['parent'] = array(
      '#type' => 'hidden',
      '#value' => file_create_path($form_values['parent'] ? $form_values['parent'] : $_GET['dir']),
    );

    // set directory
    $dir = file_create_path($current_asset->dirname ? $current_asset->dirname : $_GET['dir']);
    if(asset_check_directory($current_asset->dirname)){
      $dir = $current_asset->dirname;
    }else if(asset_check_directory($_GET['dir'])){
      $dir = $_GET['dir'];
    }else if(asset_check_directory($user->name, FILE_CREATE_DIRECTORY)){
      $dir = $user->name;
    }else{
      $dir = file_directory_path();
    }
    $dir = file_create_path($dir);

    // copy querystring args for building links 
    $query = $_GET;
    unset($query['q']);
    
    // create directory crumbs and '..' entry
    $crumbs = array();
    if($dir != file_directory_path()){
      $parts = explode('/',str_replace(file_directory_path().'/','',$dir));
      while($current = array_pop($parts)){
        $query['dir'] = $parts ? join('/',$parts).'/'.$current : $current;
        $crumbs[] = l($current,$_GET['q'],array(),asset_build_query($query));
      }
      $query['dir'] = substr($dir, 0, strrpos($dir,'/'));
      $list = '<li class="parent">'.l('..',$_GET['q'],array(),asset_build_query($query)).'</li>';
    }
    $query['dir'] = file_directory_path();
    $crumbs[] = l('assets',$_GET['q'],array(),asset_build_query($query));
  
    // build directory list and filename options array
    $result = db_query('SELECT aid FROM {asset} WHERE dirname="%s"',$dir);
    $options = array();
    while($asset = db_fetch_object($result)){
      $asset = asset_load($asset->aid);
      if(asset_access($asset)){      
        // add to list if directory or add to options if file
        if($asset->extension == ''){
          // if wizard was loaded with an aid, remove it
          if($query['aid']){
            unset($query['aid']);
          }
          $query['dir'] = $asset->filepath;
          $list  .= '<li class="folder">'.l($asset->filename,$_GET['q'],array(),asset_build_query($query)).'</li>';
        }else{
          $options[$asset->aid] = $asset->filename;
        }
      }   
    } 
  
    $form['dir_crumb'] = array('#value' => '/ '.join(' / ',array_reverse($crumbs)));

    $form['toolbar'] = array(
      '#tree' => false,
    );
    $form['toolbar']['folder'] = array(
      '#type' => 'textfield',
      '#size' => 20,
      '#attributes' => array('alt' => t('New Folder')), 
      '#prefix' => '<div class="newfolder">',
    );
    $form['toolbar']['newfolder-submit'] = array(
      '#type' => 'submit',
      '#value' => t('New Folder'),
      '#attributes' => array(
        'src' => url(drupal_get_path('module','asset').'/lullacons/folder-option-add.png'),
        'title' => t('Create a new folder.'),
      ),
      '#theme' => 'asset_image_button',
      '#suffix' => '</div>',
    );
    $form['toolbar'][] = array('#value' => '<span class="toolbar-separator">New Assets</span>');

    $query = $_GET;
    $query['dir'] = $dir;
    
    unset($query['q']);
    foreach($types as $module=>$module_types){
      foreach($module_types as $delta=>$type){
        $key = $module.':'.$delta;
        if($type['src']){
          $html = theme('image', $type['src'], $type['value'], $type['value'], NULL, FALSE);
        }else{
          $html = $type['value'];
        }
        $query['op'] = $type['value'];
        $form['toolbar'][] = array(          
          '#value' => l($html, 'asset/wizard/'.arg(2), array(), asset_build_query($query), null, false, true)
        ); 
        
      }
    }

    if($list){
      $form['folder_list'] = array('#value' =>  '<ul class="folder-list">'.$list.'</ul>');
    }
    $form['aid'] = array(
      '#type' => 'select',
      '#size' => 10,
      '#options' => $options,
    );
    if($current_asset->aid){
      $form['aid']['#default_value'] = $current_asset->aid;
    }
    $form['asset_preview'] = array('#value' => '<div class="asset-preview"></div>');
    $form['#tree'] = false;
    $form['#theme'] = 'asset_wizard_selection_form';
  
    //return $form;

    
  }  
}

function theme_asset_wizard_selection_form($form){
  $output = '<div class="crumb-left"><div class="crumb-right">'
          . drupal_render($form['dir_crumb']) . '</div></div>';
          
  $output .= '<div class="toolbar"><div class="container-inline">'
          . drupal_render($form['toolbar']) . '</div></div>';
          
  $output .= '<div class="asset-tree-widget clear-block">'
          . drupal_render($form['folder_list'])
          . drupal_render($form['aid'])
          . drupal_render($form['asset_preview'])
          . '</div>';
          
  $form[] = array('#value' => $output, '#weight' => -10);
  return theme('asset_wizard_form', $form, 'asset-selection-form');          
}

function asset_wizard_form_validate($form_id, $form_values) {
  // If the user presses 'cancel' or 'back', we should do no further
  // validation. Also, if they press 'cancel' we should actually
  // goto the finish page, because the 'submit' stage won't be called
  // if the user hasn't filled in one of the mandatory fields. In fact,
  // in that case, Drupal's built in form validation will have set
  // errors that we don't need to show the user.
  if($form_values['op'] == t(ASSET_WIZARD_CANCEL)) {
    // Clear errors from Drupal's built in validation...
    drupal_get_messages('error');
    // Now go to the 'finish page'
    drupal_goto(ASSET_WIZARD_FINISH_REDIRECT);
    return;
  } else if($form_values['op'] == t(ASSET_WIZARD_PREVIOUS)) {
    // Clear messages, and do no further validation
    drupal_get_messages('error');
    return;
  }

  // Do whatever validation here. It's probably a good idea to do a
  // switch/case on the wizard step. It may be a good idea to validate
  // everything on each call, as that will catch anyone hacking the
  // form with directly injected form posts, although at slightly
  // more processing.
  switch($form_values['op']){
    case t('Next'):
      if($form_values['step']==1 && isset($form_values['module'])){
        // allow validate to return an aid
        $retval = module_invoke($form_values['module'], 'asset_type', 'validate', $form_values['delta'], $form_values);
        if(is_numeric($retval)){
          $_POST['aid'] = $retval;
          $form_values['aid'] = $retval;
        }        
      }
      if($form_values['step']==1 && !$form_values['aid']){
        form_set_error('aid',t('Please select a file.'));
      }
      break;
    case t('New Folder'):
      if(!$form_values['folder']){
        form_set_error('folder', t('You must specify a folder name.'));
      }
      if(preg_match('/[^A-Za-z0-9-_.]/',$form_values['folder'])){
        form_set_error('folder', t('The folder name may only contain alpha-numeric characters and dashes(-), underscores(_) and periods(.).'));
      }
      break;
  }
}

function asset_wizard_form_submit($form_id, $form_values) {
  // If the user presses 'back' or 'cancel' don't do any submission work...
  if($form_values['op'] == t(ASSET_WIZARD_PREVIOUS) || $form_values['op'] == t(ASSET_WIZARD_CANCEL)) {
    return FALSE;
  }

  if($form_values['op'] == t('New Folder')){
    $dir = file_create_path($form_values['parent'].'/'.$form_values['folder']);
    if(mkdir($dir)){
      drupal_set_message('Folder <i>'.$dir.'</i> created successfully.');
    }else{
      drupal_set_message('Error creating <i>'.$dir.'</i>.','error');
    }
    $asset->filepath = $dir;
    $asset->filesize = 0;
    asset_save($asset);
    return FALSE;
  }

  if($form_values['step'] == 1 && isset($form_values['module'])){
    // allow module submits to return an aid
    $retval = module_invoke($form_values['module'], 'asset_type', 'submit', $form_values['delta'], $form_values);
    if(is_numeric($retval)){
      $_POST['aid'] = $retval;
    }
    return FALSE;
  }

  // If we haven't processed the form and completed fully, we have
  // to return FALSE so that Drupal redisplays our form.
  return FALSE;
}

function theme_asset_wizard_form($form, $main_class = NULL){
  $footer = '<div id="asset-popup-footer" class="clear-block">'.drupal_render($form['footer']).'</div>';
  $help = ($form['help'] ? '<div class="help">'.drupal_render($form['help']).'</div>' : '');
  $main = '<div id="asset-popup-main" class="'.$main_class.'">'.$help.drupal_render($form).'</div>';
  return $main.$footer;
}

function asset_wizard_finish(){
  return '<script type="text/javascript">$(insertToEditor);</script>';
}

function theme_asset_image_button($element){
  // Make sure not to overwrite classes.
  $element['#button_type'] = 'image';
  if (isset($element['#attributes']['class'])) {
    $element['#attributes']['class'] = 'form-'. $element['#button_type'] .' '. $element['#attributes']['class'];
  }
  else {
    $element['#attributes']['class'] = 'form-'. $element['#button_type'];
  }

  return '<input type="image" '. (empty($element['#name']) ? '' : 'name="'. $element['#name'] .'" ')  .'id="'. $element['#id'].'" value="'. check_plain($element['#value']) .'" '. drupal_attributes($element['#attributes']) ." />\n";
}
 
