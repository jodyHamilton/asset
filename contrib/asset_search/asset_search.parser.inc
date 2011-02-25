<?php

/**
 * @file
 * Include file to parse RSS feeds into an array of items that will then be used
 * as pseudo-assets.
 */

/**
 * Parse an rss feed and return an array of items
 * Taken from aggregator_parse_feed
 */
function asset_search_parse_feed(&$data, $type, $value) {
  global $items, $image, $channel;
  $tmp_assets = array();
  $type = asset_search_types($type);
  
  // Unset the global variables before we use them:
  unset($GLOBALS['element'], $GLOBALS['item'], $GLOBALS['tag']);
  $items = array();
  $image = array();
  $channel = array();

  // parse the data:
  $xml_parser = drupal_xml_parser_create($data);
  xml_set_element_handler($xml_parser, 'asset_search_element_start', 'asset_search_element_end');
  xml_set_character_data_handler($xml_parser, 'asset_search_element_data');

  if (!xml_parse($xml_parser, $data, 1)) {
    watchdog('asset_search', t('The feed seems to be broken, due to an error "%error" on line %line.', array('%error' => xml_error_string(xml_get_error_code($xml_parser)), '%line' => xml_get_current_line_number($xml_parser))), WATCHDOG_WARNING);
    drupal_set_message(t('The feed seems to be broken, because of error "%error" on line %line.', array('%error' => xml_error_string(xml_get_error_code($xml_parser)), '%line' => xml_get_current_line_number($xml_parser))), 'error');
    return 0;
  }
  xml_parser_free($xml_parser);

  // Initialize variables
  $title = $link = $author = $description = $guid = NULL;
  foreach ($items as $item) {
    unset($title, $link, $author, $description, $guid);

    // Prepare the item:
    foreach ($item as $key => $value) {
      $item[$key] = trim($value);
    }

    /*
    ** Resolve the item's title. If no title is found, we use
    ** up to 40 characters of the description ending at a word
    ** boundary but not splitting potential entities.
    */

    if ($item['TITLE']) {
      $title = $item['TITLE'];
    }
    else {
      $title = preg_replace('/^(.*)[^\w;&].*?$/', "\\1", truncate_utf8($item['DESCRIPTION'], 40));
    }

    /*
    ** Resolve the items link.
    */

    if ($item['LINK']) {
      $link = $item['LINK'];
    }
    if ($item['GUID']) {
      $guid = $item['GUID'];
    }

    /**
     * Atom feeds have a CONTENT and/or SUMMARY tag instead of a DESCRIPTION tag
     */
    if ($item['CONTENT:ENCODED']) {
      $item['DESCRIPTION'] = $item['CONTENT:ENCODED'];
    }
    else if ($item['SUMMARY']) {
      $item['DESCRIPTION'] = $item['SUMMARY'];
    }
    else if ($item['CONTENT']) {
      $item['DESCRIPTION'] = $item['CONTENT'];
    }

    /*
    ** Try to resolve and parse the item's publication date. If no
    ** date is found, we use the current date instead.
    */

    if ($item['PUBDATE']) $date = $item['PUBDATE'];                        // RSS 2.0
    else if ($item['DC:DATE']) $date = $item['DC:DATE'];                   // Dublin core
    else if ($item['DCTERMS:ISSUED']) $date = $item['DCTERMS:ISSUED'];     // Dublin core
    else if ($item['DCTERMS:CREATED']) $date = $item['DCTERMS:CREATED'];   // Dublin core
    else if ($item['DCTERMS:MODIFIED']) $date = $item['DCTERMS:MODIFIED']; // Dublin core
    else if ($item['ISSUED']) $date = $item['ISSUED'];                     // Atom XML
    else if ($item['CREATED']) $date = $item['CREATED'];                   // Atom XML
    else if ($item['MODIFIED']) $date = $item['MODIFIED'];                 // Atom XML
    else if ($item['PUBLISHED']) $date = $item['PUBLISHED'];               // Atom XML
    else if ($item['UPDATED']) $date = $item['UPDATED'];                   // Atom XML
    else $date = 'now';

    $timestamp = strtotime($date); // As of PHP 5.1.0, strtotime returns FALSE on failure instead of -1.
    if ($timestamp <= 0) {
      $timestamp = asset_search_parse_w3cdtf($date); // Returns FALSE on failure
      if (!$timestamp) {
        $timestamp = time(); // better than nothing
      }
    }

    $tmp = new stdClass();
    $tmp->aid = -1;
    $tmp->created = $timestamp;
    $tmp->title = $title;
    $tmp->link = $link;
    $tmp->guid = $guid;
    $tmp->cid = md5($guid);
    $tmp->search_type = $type;
    $tmp = module_invoke($type['module'], 'asset_search', 'feed item', $type, $tmp);
    
    cache_set($tmp->cid, 'cache_asset_search', serialize($tmp));
    
    $tmp_assets[$tmp->cid] = $tmp;
  }

  $channel['items'] = $tmp_assets;

  return $channel;
}

/**
 * Parse the W3C date/time format, a subset of ISO 8601. PHP date parsing
 * functions do not handle this format.
 * See http://www.w3.org/TR/NOTE-datetime for more information.
 * Originally from MagpieRSS (http://magpierss.sourceforge.net/).
 *
 * @param $date_str A string with a potentially W3C DTF date.
 * @return A timestamp if parsed successfully or -1 if not.
 */
function asset_search_parse_w3cdtf($date_str) {
  if (preg_match('/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(:(\d{2}))?(?:([-+])(\d{2}):?(\d{2})|(Z))?/', $date_str, $match)) {
    list($year, $month, $day, $hours, $minutes, $seconds) = array($match[1], $match[2], $match[3], $match[4], $match[5], $match[6]);
    // calc epoch for current date assuming GMT
    $epoch = gmmktime($hours, $minutes, $seconds, $month, $day, $year);
    if ($match[10] != 'Z') { // Z is zulu time, aka GMT
      list($tz_mod, $tz_hour, $tz_min) = array($match[8], $match[9], $match[10]);
      // zero out the variables
      if (!$tz_hour) {
        $tz_hour = 0;
      }
      if (!$tz_min) {
        $tz_min = 0;
      }
      $offset_secs = (($tz_hour * 60) + $tz_min) * 60;
      // is timezone ahead of GMT?  then subtract offset
      if ($tz_mod == '+') {
        $offset_secs *= -1;
      }
      $epoch += $offset_secs;
    }
    return $epoch;
  }
  else {
    return FALSE;
  }
}

/**
 * Call-back function used by the XML parser.
 */
function asset_search_element_start($parser, $name, $attributes) {
  global $item, $element, $tag, $items, $channel;

  switch ($name) {
    case 'IMAGE':
    case 'TEXTINPUT':
    case 'CONTENT':
    case 'SUMMARY':
    case 'TAGLINE':
    case 'SUBTITLE':
    case 'LOGO':
    case 'INFO':
      $element = $name;
      break;
    case 'ID':
      if ($element != 'ITEM') {
        $element = $name;
      }
    case 'LINK':
      if ($attributes['REL'] == 'alternate') {
        if ($element == 'ITEM') {
          $items[$item]['LINK'] = $attributes['HREF'];
        }
        else {
          $channel['LINK'] = $attributes['HREF'];
        }
      }
      break;
    case 'ITEM':
      $element = $name;
      $item += 1;
      break;
    case 'ENTRY':
      $element = 'ITEM';
      $item += 1;
      break;
  }

  $tag = $name;
}

/**
 * Call-back function used by the XML parser.
 */
function asset_search_element_end($parser, $name) {
  global $element;

  switch ($name) {
    case 'IMAGE':
    case 'TEXTINPUT':
    case 'ITEM':
    case 'ENTRY':
    case 'CONTENT':
    case 'INFO':
      $element = '';
      break;
    case 'ID':
      if ($element == 'ID') {
        $element = '';
      }
  }
}

/**
 * Call-back function used by the XML parser.
 */
function asset_search_element_data($parser, $data) {
  global $channel, $element, $items, $item, $image, $tag;
  switch ($element) {
    case 'ITEM':
      $items[$item][$tag] .= $data;
      break;
    case 'IMAGE':
    case 'LOGO':
      $image[$tag] .= $data;
      break;
    case 'LINK':
      if ($data) {
        $items[$item][$tag] .= $data;
      }
      break;
    case 'CONTENT':
      $items[$item]['CONTENT'] .= $data;
      break;
    case 'SUMMARY':
      $items[$item]['SUMMARY'] .= $data;
      break;
    case 'TAGLINE':
    case 'SUBTITLE':
      $channel['DESCRIPTION'] .= $data;
      break;
    case 'INFO':
    case 'ID':
    case 'TEXTINPUT':
      // The sub-element is not supported. However, we must recognize
      // it or its contents will end up in the item array.
      break;
    default:
      $channel[$tag] .= $data;
  }
}

