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
<body>
	<div id="asset-popup">
	<h1>$title</h1>
	$messages
  <div class="content">$content</div>
  </div>
</body>
</html>
POPUP;
}
  
function asset_tree_widget(){
	// set directory
	$dir = file_create_path($_GET['dir']);

	// create directory crumbs and '..' entry
	$crumbs = array();
  if($dir != file_directory_path()){
		$parts = explode('/',str_replace(file_directory_path().'/','',$dir));
		while($current = array_pop($parts)){
			$dir_arg = $parts ? join('/',$parts).'/'.$current : $current;
			$crumbs[] = l($current,$_GET['q'],array(),'dir='.$dir_arg);
		}
		$parent_dir = substr($dir, 0, strrpos($dir,'/'));
		$list = '<li>'.l('..',$_GET['q'],array(),'dir='.$parent_dir).'</li>';
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

	$form[] = array(
		'#value' => '<div class="breadcrumb">/ '.join(' / ',array_reverse($crumbs)).'</div>',
	);
	if($list){
  	$form[] = array(
  		'#value' =>  '<ul>'.$list.'</ul>',
  	);
	}
	$form['aid'] = array(
		'#type' => 'select',
		'#size' => 10,
		'#options' => $options,
	);
	$form[] = array(
		'#value' => '<div class="asset-preview"></div>',
	);
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
	if($form_values == null && is_numeric($_GET['aid'])){
		$form_values['step'] = 1;
		$form_values['aid'] = $_GET['aid'];
	}
	
  // Get the "step" in the wizard we're on. If it's not yet set, then
  // we must be on step one. We usually increment the step, but if
  // the user last pressed the 'back' button, then we decrement it instead.
  if (!isset($form_values)) {
    $step = 1;
  } else {
    if(isset($form_values['op']) && $form_values['op'] == t('Back')) {
      // Back button pressed...
      $step = $form_values['step'] - 1;
		} elseif(isset($form_values['op']) && in_array($form_values['op'],array(t('New Folder'),t('Upload')))){
			$step = $form_values['step'];
    } else {
      $step = $form_values['step'] + 1;
    }
  }

  // Put a hidden value in the form that says which step we're on.
  // This gets posted back to us, and used (above) next time around.
  $form['step'] = array(
    '#type' => 'hidden',
    '#value' => $step,
  );

  // This is purely cosmetic. We just say which page we're on. This
  // probably wants removing (or at least pretty-ing up!)
	drupal_set_title("Asset Wizard - Step $step");

  // These are *very* important. 'multistep' tells Drupal to store
  // extra information between form steps. 'tree' tells drupal to
  // preserve the multi-dimensional form information we're using.
  // 'tree' isn't completely necessary in this example, but for
  // big/complex forms, it's pretty obligatory!
  $form['#multistep'] = TRUE;
  $form['#tree'] = TRUE;

  // if macro was set on previous step, then extract info here
  if($form_values['macro']){
    $macros = asset_get_macros(' '.$form_values['macro'].' ');
    $macro = array_pop($macros);
    if($macro['aid']){
	    $asset = asset_load($macro['aid']);
    }
    $form[] = array('#type'=>'item','#title'=>t('Asset'),'#value'=>$asset->filename);
  }elseif($form_values['aid']){
		$asset = asset_load($form_values['aid']);
  }

  // This is where we actually produce the form on each step of the
  // wizard. Naturally, it's possible to have as many steps as needed
  // here. It's not obligatory, but useful to separate each page in
  // a separate key in for $form.
  switch($step) {
    case 1:
			$result = db_query('SELECT * FROM {asset}');
			while($row = db_fetch_object($result)){
        $options[$row->aid] = $row->filename;
			}
      $form[] = asset_tree_widget();
      $form['parent'] = array(
      '#type' => 'hidden',
      '#value' => file_create_path($form_values['parent'] ? $form_values['parent'] : $_GET['dir']),
      );
      $form['newfolder'] = array(
      	'#prefix' => '<div class="container-inline">',
      	'#suffix' => '</div>',
				'#tree' => false,
				'#type'=>'fieldset',
				'#collapsible'=>'true',
				'#collapsed'=>'true',
				'#title' => t('Folder Options'),
     	);
     	$form['newfolder']['folder'] = array(
    		'#type' => 'textfield',
    		'#title' => t('New Folder'),
    		'#size' => 42,
  		);
    	$form['newfolder'][] = array(
    		'#type' => 'submit',
  			'#value' => t('New Folder'),
  		);
  		
  		$form['newfile'] = array(
				'#tree' => false,
				'#type'=>'fieldset',
				'#collapsible'=>'true',
				'#collapsed'=>'true',
				'#title' => t('File Upload'),
				);

  		$form['newfile']['upload'] = array(
    		'#type' => 'file',
  			'#title' => t('New File'),
  			'#size' => 35,
  			);
  		$form['newfile']['title'] = array(
    		'#type' => 'textfield',
    		'#title' => t('Title'),
  		);
  		$form['newfile']['author'] = array(
    		'#type' => 'textfield',
    		'#title' => t('Author'),
  		);
  		$form['newfile']['description'] = array(
    		'#type' => 'textarea',
    		'#title' => t('Description'),
    		'#rows' => 3,
  		);
  		$form['newfile']['status'] = array(
  			'#type' => 'radios',
  			'#title' => t('Status'),
  			'#required' => true,
  			'#default_value' => ASSET_PUBLIC,
  			'#options' => array(
  				ASSET_PRIVATE => t('Private'),
  				ASSET_PUBLIC => t('Public'),
  			),
  		);
  		$form['newfile'][] = array(
    		'#type' => 'submit',
    		'#value' => t('Upload'),
  		);
  		
  		$form['#attributes']['enctype'] = 'multipart/form-data';
      break;
    case 2:
			$form['macro'] = array('#type'=>'hidden', '#value' => asset_build_macro(array('aid'=>$form_values['aid'])));
			$asset = asset_load($form_values['aid']);
			$form[] = array('#type'=>'item','#title'=>t('Asset'),'#value'=>$asset->filename);
			$form['formatter'] = array(
        '#type' => 'select',
        '#title' => t('Formatter'),
        '#options' => asset_formatter_options($asset->filename),
      );
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
			$module_options = (array)module_invoke($macro['formatter'],'assetapi','options',$asset,$macro);
			$form['options'] = array_merge($default_options, $module_options);
			$form['options']['#tree'] = true;
			break;
			// if no options, increment step and fall through
//			$form['step']['#value']++;
//			$step++;
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

  // This is important. If we're on the final step,
  // we tell drupal to use the normal redirect functionality.
  // That means the browser goes to whatever page after the
  // final submit. All previous steps don't redirect, so just
  // post back to this form.
  if($step == ASSET_WIZARD_FINAL_STEP) {
    $form['#redirect'] = NULL;
  } else {
    $form['#redirect'] = FALSE;
  }

  $form['footer']['#tree'] = false;
  $form['footer']['cancel'] = array(
    '#type' => 'submit',
    '#value' => t(ASSET_WIZARD_CANCEL),
  );
  $form['footer']['previous'] = array(
    '#type' => 'submit',
    '#value' => t(ASSET_WIZARD_PREVIOUS),
		'#attributes' => ($step > 1 ? array() : array('disabled'=>'disabled'))
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
    // Don't do any submission work here, it's not relevant
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

	if($form_values['op'] == t('Upload')){
  	if($file = file_check_upload('upload')){
  		$path = file_create_path($form_values['parent'].'/'.$file->filename);
  		if($file = file_save_upload('upload', $path)){
				$file->status = $form_values['status']; 
				$file->title = $form_values['title'];
				$file->author = $form_values['author'];
				$file->description = $form_values['description'];
				asset_save($file);
  			drupal_set_message('File saved.');
  		}else{
  			drupal_set_message('Error saving file to <em>'.$path.'</em>','error');
  		}
  	}else{
  		drupal_set_message('file_check_upload failed','error');
  	}
		return FALSE;
	}

  // Process the form values. In this example, we only do something
  // when we reach the end of the wizard. Our example just displays
  // the form values on whatever page we redirect to.
  if(isset($form_values['step']) && $form_values['step'] == ASSET_WIZARD_FINAL_STEP) {
    if(!is_null($form_values)) {
      foreach (array_keys($form_values) as $pagenum) {
        if(is_array($form_values[$pagenum])) {
          foreach ($form_values[$pagenum] as $key => $value) {
            drupal_set_message("Got page $pagenum key $key = $value"); 
          }
        }
      }
    }
    // Now send the browser to the 'finish page'.
    return ASSET_WIZARD_FINISH_REDIRECT;
  }

  // If we haven't processed the form and completed fully, we have
  // to return FALSE so that Drupal redisplays our form.
  return FALSE;
}

function theme_asset_wizard_form($form){
	$footer = '<div id="asset-popup-footer">'.drupal_render($form['footer']).'</div>';
	$main = '<div id="asset-popup-main">'.drupal_render($form).'</div>';
	return $main.$footer;
}

function asset_wizard_finish(){
	return '<script type="text/javascript">$(insertToEditor);</script>';
}