﻿/**
 * Asset search widget related JS actions.
 */

var assetWidget = assetWidget || {};

// Store ID of the current tab.
assetWidget.currentTab = false;

// Special flag to make possible run nested loader and show only one.
assetWidget.loaderEnabled = false;

// Internal property to store current search params.
assetWidget.filterParams = '';

// Flag to accept drop when item moved from widget, to prevent dropping through widget.
assetWidget.allowDrop = false;

(function ($) {

  Drupal.behaviors.assetWidget = {
    attach:function (context, settings) {
      assetWidget.launch($(context), settings);
    }
  };

  /**
   * Wrapper for behavior attach callback.
   */
  assetWidget.launch = function ($context, settings) {
    $context.find('.assets-module').once('asset-search-widget', function () {
      // Store widget context.
      assetWidget.$widget = $(this);

      // First we init tabs to make possible get send request for tabs content.
      assetWidget.initTabs();
      assetWidget.initSlide();
    });

    // We bind tooltips actions with timeout to let content be rendered.
    setTimeout(function () {
      assetWidget.initTooltips($context);
    }, 0);

    assetWidget.initScroll($context);

    // Drag events
    assetWidget.initDrag($context);

    // Bind widget height adjusting.
    assetWidget.initHeightAdjust($context);
  };

  /**
   * Init tabs, bind all related events.
   */
  assetWidget.initTabs = function () {
    assetWidget.$widget.find(".tab-links li a").click(function () {
      // Handle tab switch action, loader, content etc.
      assetWidget.gotoTab($(this));
    });

    assetWidget.getTabContent(false);
  };

  /**
   * Request for content of specified tab ID, or for all available if tab ID omitted.
   */
  assetWidget.getTabContent = function (tabId, args) {
    // Here we show loader, but it will be hidden in async gotoTab command.
    assetWidget.showTabLoader();
    var url = Drupal.settings.basePath + "ajax/asset-widget/get/tab" + (tabId ? '/' + tabId : '');
    var settings = {url : url};
    if (args) {
      settings.submit = args;
    }
    var ajax = new Drupal.ajax(false, false, settings);
    // Set flag to act as our custom exposed plugins, see Drupal.ajax.prototype.success.
    ajax.assetWidgetAjax = true;
    // See returned ajax.commands for further actions.
    ajax.eventResponse(ajax, {});
  };

  /**
   * Build content of iframe based tab content.
   */
  assetWidget.getTabAsyncContent = function (tabId, args) {
    if (assetWidget.asyncTabs && assetWidget.asyncTabs[tabId]) {
      assetWidget.showTabLoader();

      var $tabContent = $(assetWidget.getTabSelectorById(tabId));

      // Handle always refreshed tabs.
      if ($(assetWidget.getTabLinkSelectorById(tabId)).hasClass('refresh-content') && $tabContent.html().length != 0) {
        $tabContent.html('');
      }

      var $parent = $tabContent.parents('.mid');
      var src = '';
      // For now we handle only two types of async tabs - create/edit form.
      if (args && args.aid) {
        src = 'admin/content/assets/manage/' + args.aid;
      }
      else {
        src = 'admin/content/assets/add/' + assetWidget.asyncTabs[tabId];
      }

      var $frame = $('<iframe />')
        .attr({
          'src': Drupal.settings.basePath + src + '?asset_frame=true',
          // Set frame size depending from current widget size.
          'width': $parent.width() - 20,
          'height': $parent.height()
        });

      $frame.load(function () {
        // If URL changed to non-form page, switch tab.
        if (!this.contentWindow.location.pathname.match('admin/content/assets/add')
          && !this.contentWindow.location.pathname.match('admin/content/assets/manage/')) {
          // Refresh results and switch to tab.
          var tabArgs = {};

          if (args && args.aid && assetWidget.filterParams) {
            tabArgs['filter_params'] = assetWidget.filterParams;
          }

          if (assetWidget.tabDomIDs && assetWidget.tabDomIDs['results']) {
            tabArgs['dom_id'] = assetWidget.tabDomIDs['results'];
          }

          assetWidget.getTabContent('results', tabArgs);
        }
        else {
          assetWidget.hideTabLoader(true);
        }
      });
      $tabContent.html($frame);
    }
  };

  /**
   * Set tab content by ID.
   */
  assetWidget.setTabContent = function (tabId, content) {
    $('.tab-contents ' + assetWidget.getTabSelectorById(tabId)).html(content);
  };

  /**
   * Build tab class based on tab id.
   */
  assetWidget.getTabSelectorById = function (tabId) {
    return '.tab.' + tabId + '-tab';
  };

  /**
   * Build tab link class based on tab id.
   */
  assetWidget.getTabLinkSelectorById = function (tabId) {
    return '.' + tabId + '-tab';
  };

  /**
   * Switch among tabs.
   */
  assetWidget.gotoTab = function ($targetTabLink, dontRefresh) {
    // Get tab id from class.
    var matches = $targetTabLink.attr('class').match(/([_\w]+)-tab+/);
    if (matches[1]) {
      var tabId = matches[1];
      // Handle only change to another tab.
      if (tabId != assetWidget.currentTab) {
        // Make current tab active.
        $targetTabLink.parent().siblings().find('a').removeClass("active");
        $targetTabLink.addClass("active");
        // Hide other tabs content.
        assetWidget.$widget.find(".tab").css("visibility", "hidden").addClass('hidden');

        // Store current active tab.
        assetWidget.currentTab = tabId;

        var $tabContent = assetWidget.$widget.find(assetWidget.getTabSelectorById(tabId));

        // If async tab empty yet, fill it.
        if ($targetTabLink.hasClass('async') && (!dontRefresh || $tabContent.html().length == 0)) {
          assetWidget.getTabAsyncContent(tabId);
        }
        // We show content immediately only for static tabs.
        else {
          $tabContent.css({opacity:0, visibility:"visible"}).removeClass('hidden').animate({opacity:1}, 200);
        }

        assetWidget.scrollTop(assetWidget.currentTab);
        if ($targetTabLink.hasClass('filter-params')) {
          assetWidget.paramUp();
        }
        else {
          assetWidget.paramDown();
        }
      }
      // And ensure that selected is visible.
      else {
        assetWidget.$widget.find(assetWidget.getTabSelectorById(tabId))
          .css("visibility", "visible").removeClass('hidden');
      }
    }
  };

  /**
   * Wrapper to easy use of gotoTab.
   */
  assetWidget.gotoTabById = function (tabId, dontRefresh) {
    var $targetTabLink = assetWidget.$widget.find(assetWidget.getTabLinkSelectorById(tabId));
    assetWidget.gotoTab($targetTabLink, dontRefresh);
  };

  /**
   * Show loader and hide current tab's content.
   */
  assetWidget.showTabLoader = function () {
    if (!assetWidget.loaderEnabled) {
      // Mask used to block clicks to other tabs until switch to target don't finished.
      assetWidget.$widget.find(".mask").show();

      var tabId = assetWidget.currentTab;
      if (tabId) {
        assetWidget.$widget.find(assetWidget.getTabSelectorById(tabId)).css("visibility", "hidden").addClass('hidden');
      }
      assetWidget.$widget.find(".loading").show().removeClass('hidden');

      assetWidget.loaderEnabled = true;
    }
  };

  /**
   * Hide loader.
   */
  assetWidget.hideTabLoader = function (showTab) {
    if (assetWidget.loaderEnabled) {
      assetWidget.$widget.find(".loading").addClass('hidden').hide();
      assetWidget.$widget.find(".mask").hide();
      assetWidget.loaderEnabled = false;
      // Ensure that tab is shown.
      if (showTab) {
        assetWidget.$widget
          .find(assetWidget.getTabSelectorById(assetWidget.currentTab))
          .css({opacity:0, visibility:"visible"}).removeClass('hidden').animate({opacity:1}, 200);
      }
    }
  };

  /**
   * Bind slide animation to widget.
   */
  assetWidget.initSlide = function () {
    var $assetBlock = assetWidget.$widget;
    var $assetToggler = $assetBlock.find(".show-control");
    $assetBlock.addClass('initialised');

    $assetToggler.toggle(function () {

      $assetBlock.animate({"right":"0"}, 700, 'linear', function () {

        $assetToggler.addClass("active");

        if ($assetBlock.hasClass('initialised')) {
          $assetBlock.removeClass('initialised');
        }
      });

    }, function () {

      assetWidget.hideTooltips();
      $assetBlock.animate({"right":"-435px"}, 700, 'linear', function () {
        $assetToggler.removeClass("active");
      });
    });
  };

  /**
   * Bind control elements.
   */
  assetWidget.controlsBind = function ($context) {
    // On reset button, just rebuild search tab.
    $context.find('.views-reset-button input, .no-results .button.button-back a')
      .once('asset-widget-reset-search', function () {
      $(this).unbind().click(function (event) {
        event.preventDefault();
        assetWidget.getTabContent('search');
      });
    });

    // Bind tooltips links.
    $context.find(".items-wrap .buttons .button-preview").once('asset-preview-tooltip-link', function () {
      $(this).click(function (event) {
        // Block click on body event.
        event.stopPropagation();
        $(this).parents(".item").find(".tooltip-call").click();
      });
    });

    // Autocomplete crossbrowser z-index.
    $context.find(".form-autocomplete").once(function () {
      var $this = $(this);
      var $formItem = $this.parents('.form-item');

      $this.focus(function () {
        $formItem.addClass('form-item-tooltipped');
      });
      $this.blur(function () {
        $formItem.removeClass('form-item-tooltipped');
      });
    });

    // Asset modify link action.
    $context.find('a.asset-widget-modify-asset').once(function () {
      $(this).click(function () {
        var idParts = $(this).attr('id').split('-');
        var aid = idParts.pop(),
          type = idParts.pop();
        if (aid) {
          assetWidget.getTabAsyncContent(type, {aid: aid});
          assetWidget.gotoTabById(type, true);
        }
        return false;
      });
    });

    // Bind nice selects if available.
    if ($.fn.selectmenu) {
      $context.find(".form-select:not([multiple='multiple'])").once(function () {
        $(this).selectmenu({
          style:'dropdown',
          open:function (event) {
            $(".ui-selectmenu-menu").addClass("ui-selectmenu-menu-assets");
          },
          close:function (event) {
            $(".ui-selectmenu-menu").removeClass("ui-selectmenu-menu-assets");
          }
        });
      });
    }

    if ($.fn.multiSelect) {
      $context.find(".form-select[multiple]").once(function () {
        assetWidget.initMultiselect($(this));
      });
    }
  };

  // Add multiselects support.
  if ($.fn.multiSelect) {
    assetWidget.initMultiselect = function ($item, changeCallback) {
      var selectAllMessage = Drupal.t("- All -");
      var $current = $item.parents(".form-item");
      $current.addClass('item-multiselect');
      $item.multiSelect({
        selectAll: true,
        selectAllText: selectAllMessage,
        noneSelected: '',
        oneOrMoreSelected: '*'
      }, function () {
        assetWidget.multiselectCallback($current, selectAllMessage);
        if ($.isFunction(changeCallback)) {
          changeCallback($current, selectAllMessage);
        }
      });
      assetWidget.multiselectCallback($current, selectAllMessage);
      // On form submit we force list hidding.
      assetWidget.$widget.find('[type="submit"]').click(function () {
        $current.find(".multiSelectOptions").css({visibility:"hidden"});
      });

      $current.find(".multiSelectOptions label:last").addClass("last");
    };

    assetWidget.multiselectCallback = function ($current, selectAllMessage) {
      if ($current.find(".selectAll").hasClass("checked")) {
        $current.find(".multiSelect span").text(selectAllMessage);
      }
    };
  }

  /**
   * Apply scrolls.
   */
  assetWidget.initScroll = function ($context) {
    if ($.fn.jScrollPane != undefined) {
      if (assetWidget.jscrollInstances == undefined) {
        // Storage for JScroll instances.
        assetWidget.jscrollInstances = {};
      }

      $context.find(".items-wrap, .form-wrap .mid-inner").once(function () {
        $(this).each(function () {
          var $pane = $(this);
          $pane.jScrollPane({enableKeyboardNavigation: false});
          var matches = $pane.parents('.tab').attr('class').match(/([_\w]+)-tab+/);
          // Use tabId as object key.
          if (matches[0]) {
            assetWidget.jscrollInstances[matches[0]] = $pane.data('jsp');
          }
        });
      });
    }
  };

  /**
   * Reinit all scrolls.
   */
  assetWidget.scrollReinit = function () {
    if ($.fn.jScrollPane != undefined && assetWidget.jscrollInstances) {
      $.each(assetWidget.jscrollInstances, function () {
        this.reinitialise();
      });
    }
  };

  /**
   * Scroll to top of tab.
   */
  assetWidget.scrollTop = function (tabId) {
    if (assetWidget.jscrollInstances && assetWidget.jscrollInstances[tabId + '-tab'] != undefined) {
      var selector = '.' + tabId + '-tab .jspPane';
      if ($(selector).length) {
        assetWidget.jscrollInstances[tabId + '-tab'].scrollToElement(selector, true);
      }
    }
  };

  /**
   * Bind tooltip links.
   */
  assetWidget.initTooltips = function ($context) {

    // Each tooltip toggle to find its match.
    $context.find(".tooltip-call").once('asset-tooltips', function () {
      var $this = $(this);
      var $order = $this.attr('class').match(/order-[\d]+/);
      var $tooltipContent = $context.find(".tooltips-container ." + $order);
      var $module = assetWidget.$widget;

      /*
       *  Tooltip content's width calculation, note that we need
       *  .thumbnail element content have the "width" and "height" attributes to be set
       *  for webkit proper calculation.
       */
      $tooltipContent.css({'right':'-9999px', 'top':'-9999px', 'visibility':'hidden'});
      $tooltipContent.show();

      // Get width based on tooltip content.
      var imgWidth = $tooltipContent.find(".thumbnail img").width();
      var videoWidth = $tooltipContent.find(".thumbnail object").width();

      var elWidth;
      if (imgWidth) {
        elWidth = imgWidth;
      }
      else if (videoWidth) {
        elWidth = videoWidth;
      }
      else {
        // Present width to the default tooltip size.
        elWidth = 328;
      }

      // Set width.
      $tooltipContent.find(".inner-el").width(elWidth);

      var $matchHeight = $tooltipContent.height();
      $tooltipContent.hide();
      $tooltipContent.css({'right':'auto', 'top':'auto', 'visibility':'visible'});

      if ($tooltipContent.hasClass('tooltip-media')) {
        $this.click(function () {
          var $activeTooltipContainer = $('.active-tooltip-container');

          // Show only other tooltip.
          if (!$activeTooltipContainer.find('.' + $order).size()) {
            assetWidget.hideTooltips();

            // Insert tooltip content to common wrapper to fit styles.
            $activeTooltipContainer.html($tooltipContent.parent().html());
            var $activeTooltip = $activeTooltipContainer.children();

            $activeTooltip.click(function (event) {
              event.stopPropagation();
            });

            $activeTooltip.find(".close").click(function () {
              assetWidget.hideTooltips();
            });

            var $windowHeight = $(window).height();
            var $moduleOffset = $module.offset();
            var $thisHeight = $this.height();
            var $thisOffset = $this.offset();
            var $top = $thisOffset.top - $moduleOffset.top - 10;
            var $left = $thisOffset.left - $moduleOffset.left - $activeTooltip.outerWidth() + 10;

            // Check for the element going below the viewport
            if (($matchHeight + $thisOffset.top) > $windowHeight) {
              $activeTooltip.addClass("tooltip-show-below");
              $top = $thisOffset.top - $moduleOffset.top - $matchHeight + $thisHeight + 25;
              $activeTooltip.css({"top":$top + "px", "left":$left + "px"}).fadeIn(200).addClass('tooltip-show');
            }
            else {
              $activeTooltip.css({"top":$top + "px", "left":$left + "px"}).fadeIn(200).addClass('tooltip-show');
            }
          }
        });
      // @todo This case used for saved bookmarks tab and not used now.
      } else if ($tooltipContent.hasClass('tooltip-parameters')) {
        $this.click(function () {
          assetWidget.hideTooltips();
          var $windowHeight = $(window).height();
          var $moduleOffset = $module.offset();
          var $thisHeight = $($this).height();
          var $thisOffset = $($this).offset();
          var $top = $thisOffset.top - $moduleOffset.top - 28;
          var $left = $thisOffset.left - $moduleOffset.left - $tooltipContent.outerWidth() + 10;

          // Check for the element going below the viewport
          if (($matchHeight + $thisOffset.top) > $windowHeight) {
            $tooltipContent.addClass("tooltip-show-below");
            $top = $thisOffset.top - $moduleOffset.top - $matchHeight + $thisHeight + 30;
            $tooltipContent.css({"top":$top + "px", "left":$left + "px"}).fadeIn(200).addClass('tooltip-show');
          }
          else {
            $tooltipContent.css({"top":$top + "px", "left":$left + "px"}).fadeIn(200).addClass('tooltip-show');
          }
        });
      }

      $this.click(function (event) {
        event.stopPropagation();
      });
    });

    // Hide tooltips on window resize, scrolling, etc.
    assetWidget.$widget.once('asset-bind-resize', function () {
      $(window).resize(function () {
        setTimeout(
          function () {
            assetWidget.hideTooltips();
          }, 0);
      });

      $('body').click(function () {
        assetWidget.hideTooltips();
      });
    });

    // Hide tooltips on scrolling.
    $context.find(".items-wrap").once(function () {
      $(this).bind('scroll', function () {
        assetWidget.hideTooltips();
      })
    });

    // Text input tooltips of search filters description.
    $context.find(".views-exposed-widgets .views-exposed-widget .description").once('asset-inputs-tooltips', function () {
      var $formItem = $(this).parents(".views-exposed-widget");

      $formItem.find('input').focus(function () {
        $formItem.find(".description").fadeIn(150);
        $formItem.addClass('form-item-tooltipped');
      }).blur(function () {
        $formItem.find(".description").hide();
        $formItem.removeClass('form-item-tooltipped');
      });
    });
  };

  /**
   * Bind reaction to handle search filters tooltip.
   */
  assetWidget.searchFiltersTooltipBind = function ($context) {
    function hoverIn() {
      $(this).addClass("hover");
    }

    function hoverOut() {
      $(this).removeClass("hover");
    }

    $context.find(".links-a .inner").bind('mouseenter', hoverIn).bind('mouseleave', hoverOut);
  };

  /**
   * Hide all opened tooltips.
   */
  assetWidget.hideTooltips = function () {
    // Remove active tooltip's HTML.
    $('.active-tooltip-container').html('');
  };

  /**
   * Drag&drop init.
   */
  assetWidget.initDrag = function ($context) {
    $context.find('li.item.item-drag .item-inner').once('assets-drag', function () {
      var $form = $('form:not(.asset-widget-search-exposed-form)');
      var $asset = $(this);
      var classMatch = $asset.parents('.item').attr('class').match(/match-[\w]+/);
      classMatch = (classMatch && (classMatch[0] != null)) ? classMatch.pop() : null;

      if (classMatch) {
        $asset.draggable({
          helper: 'clone',
          appendTo: $asset.parents('.tab'),
          revert: function(droppedTo) {
            if (droppedTo && droppedTo.find('.' + classMatch).size()) {
              return false;
            }
            return true;
          },
          start: function (event, ui) {
            assetWidget.allowDrop = false;
            var $match = $form.find('.' + classMatch + ':not(".item-drag, .assets-drag-processed")');

            assetWidget.hideTooltips();
            // Add refuse style to all elements.
            // Handle text area.
            $form.find('textarea.match-field').parent().addClass('field-refuse');
            // Handle inputs.
            var $fieldWrapper = $form.find('input.match-field').parent();
            var $multipleFieldWrapper = $form.find('input.match-field').parents('tr td');

            if ($multipleFieldWrapper.size()) {
              $multipleFieldWrapper.addClass('field-refuse');
            }
            else {
              $fieldWrapper.addClass('field-refuse');
            }

            $.each($match, function() {
              var $this = $(this);
              // We haven't case when we can restrict to add some types to wysiwyg.
              // Add accept style to matched fields.
              var $fieldWrapper = $this.parent();
              var $multipleFieldWrapper = $this.parents('tr td');

              if ($multipleFieldWrapper.size()) {
                $multipleFieldWrapper.addClass('field-accept');
              }
              else {
                $fieldWrapper.addClass('field-accept');
              }
            });

            // Blur buttons in original item.
            ui.helper.prevObject.parents('.item').addClass('blurred');
            // Store match type in cloned object.
            ui.helper.prevObject.addClass(classMatch);
            // Add blur to clone.
            ui.helper.addClass('blurred');
          },
          stop:function (event, ui) {
            ui.helper.prevObject.parents('.item').removeClass('blurred');
            $form.find('.match-field, .form-textarea-wrapper, .form-item, tr td').removeClass('field-accept field-refuse');
          }
        });
      }
    });

    // Handle input format switching.
    if (Drupal.settings.assetWidget
      && Drupal.settings.assetWidget.allowedFormats
      && Drupal.settings.assetWidget.additionalClasses) {
      $context.find('select.filter-list').once('assets-format', function () {
        $(this).change(function () {
          var format = $(this).val();
          var $parent = $(this).parents('.text-format-wrapper').find('.form-textarea-wrapper');
          var additionalClasses = '';
          $.each(Drupal.settings.assetWidget.additionalClasses, function (key, value) {
            additionalClasses += value + ' ';
          });

          var $textarea = $parent.children('textarea');

          // If selected input format allow assets, add classes, elsewhere remove to avoid drop.
          if (Drupal.settings.assetWidget.allowedFormats[format]) {
            $textarea.addClass(additionalClasses);
            assetWidget.initDrop($parent);
          }
          else {
            $textarea.removeClass(additionalClasses);
          }
        });
      });
    }

    assetWidget.initDrop($context);

    // Our widget could overlaps really droppable fields, to avoid bad dropping through widget, just do nothing.
    assetWidget.$widget.once('asset-widget-droppable', function() {
      $(this).droppable({
        out: function() {
          assetWidget.allowDrop = true;
        },
        over: function() {
          assetWidget.allowDrop = false;
        }
      });
    });
  };

  /**
   * Bind drop events.
   */
  assetWidget.initDrop = function ($context) {
    $context.find('.match-field').parent().once('assets-drop', function () {
      $(this).droppable({
        // Can't use accept method because we have only draggable item here.
        // We need drop object to check it's asset type matching.
        drop: function(event, ui) {
          if (assetWidget.allowDrop) {
            // Get allowed types.
            var matches = ui.draggable.attr('class').match(/match-([\w]+)/);
            var classMatch = (matches && (matches[0] != null)) ? matches.shift() : null;
            if (matches[0]) {
              var type = matches[0];
            }
            var $droppedField = $(event.target).find('.' + classMatch);

            if ($droppedField.size()) {
              var draggedAssetAid = ui.draggable.children().attr('class').match(/order-(\d+)/);
              draggedAssetAid = (draggedAssetAid && (draggedAssetAid[0] != null)) ? draggedAssetAid.pop() : null;

              if (draggedAssetAid) {
                if ($droppedField.is('textarea') && CKEDITOR && Assets) {
                  var aid = draggedAssetAid,
                    tag_id = [aid, type, new Date().getTime()].join(':');
                  var html = Assets.getDataById(tag_id);
                  if (html && CKEDITOR && CKEDITOR.instances && CKEDITOR.instances[$droppedField.attr('id')]) {
                    var editor = CKEDITOR.instances[$droppedField.attr('id')];
                    var element = CKEDITOR.dom.element.createFromHtml(html);
                    element.setAttribute('contentEditable', 'false');
                    editor.insertElement(element);
                  }
                }
                else {
                  var settings = {
                    url : Drupal.settings.basePath + 'ajax/asset-widget/drop',
                    submit : {
                      aid : draggedAssetAid,
                      selector_id : $droppedField.attr('id')
                    }
                  };

                  // Send AJAX request to fetch rendered entity or label.
                  var ajax = new Drupal.ajax(false, false, settings);
                  ajax.eventResponse(ajax, {});
                }
              }
            }
          }
        }
      });
    });
  };

  /**
   * Bind links to modify current search.
   */
  assetWidget.modifySearchBind = function ($context) {
    $context.find('.asset-widget-modify-search').click(function () {
      assetWidget.getTabContent('search', {filter_params: assetWidget.filterParams});
    });
  };

  /**
   * Bind widget height adjusting.
   */
  assetWidget.initHeightAdjust = function ($context) {
    if ($.contains($context, $('.assets-module'))
      || $context.hasClass('assets-module')
      || $.contains($('.assets-module'), $context)) {
      var $windowHeight = $(window).height();
      var $doit;
      var $widgetHeight = 695;
      var $showControl = assetWidget.$widget.find(".show-control-wrap .top");
      var $mid = assetWidget.$widget.find(".tab-contents .tab-contents-bottom > .mid");
      var $itemWrap = assetWidget.$widget.find(".tab-contents .tab-contents-bottom .mid .tab .items-wrap");
      var $midInner = assetWidget.$widget.find(".tab-contents .tab-contents-bottom .mid .tab .form-wrap .mid .mid-inner");

      if ($windowHeight < $widgetHeight) {
        $showControl.height(500 - ($widgetHeight - $windowHeight));
        $mid.css("height", 540 - ($widgetHeight - $windowHeight));
        $itemWrap.height(483 - ($widgetHeight - $windowHeight));
        $midInner.height(486 - ($widgetHeight - $windowHeight));
      }

      assetWidget.$widget.once(function () {
        $(window).resize(function () {
          var $windowHeight = $(window).height();

          // Handle window size.
          if ($windowHeight < $widgetHeight) {
            $showControl.height(500 - ($widgetHeight - $windowHeight));
            $mid.css("height", 540 - ($widgetHeight - $windowHeight));
            // Listing.
            assetWidget.$widget.find('.tab-contents .tab-contents-bottom .mid .tab .items-wrap').height(483 - ($widgetHeight - $windowHeight));
            // Search form.
            assetWidget.$widget.find('.tab-contents .tab-contents-bottom .mid .tab .form-wrap .mid .mid-inner').height(486 - ($widgetHeight - $windowHeight));
            // iframe.
            assetWidget.$widget.find('.tab-contents .tab-contents-bottom .mid .tab iframe').height(544 - ($widgetHeight - $windowHeight));
          }
          else {
            // Rebuilt full widget height.
            $showControl.height(500);
            $mid.css("height", 540);
            assetWidget.$widget.find(".tab-contents .tab-contents-bottom .mid .tab .items-wrap").height(483);
            assetWidget.$widget.find(".tab-contents .tab-contents-bottom .mid .tab .form-wrap .mid .mid-inner").height(486);
            assetWidget.$widget.find('.tab-contents .tab-contents-bottom .mid .tab iframe').height(544);
          }

          // Reinit scroll.
          assetWidget.scrollReinit();

          clearTimeout($doit);
          $doit = setTimeout(function () {}, 10);
        });
      });
    }
  };

  /**
   * Bind size mode changing.
   */
  assetWidget.viewSwitch = function ($context) {
    $context.find(".view-switch").once('asset-widget-viewSwitch', function () {

      var $viewSwitcher = $(this);
      var $x3 = $viewSwitcher.find(".x3 a");
      var $x5 = $viewSwitcher.find(".x5 a");

      $x5.click(function () {
        var $tab = assetWidget.$widget.find(".tab:not(.hidden)");

        $x5.addClass("active");
        $x3.removeClass("active");
        $tab.addClass("view-x5");
        assetWidget.scrollReinit();
      });

      $x3.click(function () {
        var $tab = assetWidget.$widget.find(".tab:not(.hidden)");

        $x3.addClass("active");
        $x5.removeClass("active");
        $tab.removeClass("view-x5");
        assetWidget.scrollReinit();
      });
    });
  };

  /**
   * Show search filters block at the top tab.
   */
  assetWidget.paramUp = function () {
    var $searchParams = assetWidget.$widget.find(".tab-contents-top");
    if ($searchParams.size()) {
      if ($searchParams.hasClass('tab-contents-noparam')) {
        $searchParams.removeClass('tab-contents-top-empty').animate({"top":"-53px"}, 150, 'linear');
      }
      else {
        $searchParams.removeClass('tab-contents-top-empty').animate({"top":"-103px"}, 150, 'linear');
      }
    }
  };

  /**
   * Hide search filters block.
   */
  assetWidget.paramDown = function () {
    assetWidget.$widget.find(".tab-contents-top").animate({"top":"-11px"}, 150, 'linear', function () {
      // @todo we have problem with that class, becuase it could be added with delay after paramUp complete.
      //$(this).addClass('tab-contents-top-empty');
    });
  };

  /**
   * Helper to check that view with specified dom id is asset search view with exposed form.
   */
  assetWidget.isAssetWidgetView = function (viewDomId) {
    var result = false;
    if (viewDomId && assetWidget.tabDomIDs) {
      $.each(assetWidget.tabDomIDs, function(i, domID) {
        if (viewDomId == domID) {
          result = true;
        }
      });
    }
    return result;
  };

  if (Drupal.ajax != undefined) {

    /**
     * Ajax delivery command to insert tabs content in their's places.
     */
    Drupal.ajax.prototype.commands.assetWidgetInsertTabContent = function (ajax, response, status) {
      if (response.data) {
        var count = 0;
        for (var tabId in response.data) {
          assetWidget.setTabContent(tabId, response.data[tabId]);
          count++;
        }

        // Optimize behaviors call in case of single tab update.
        if (count) {
          if (count == 1) {
            Drupal.attachBehaviors($(assetWidget.getTabSelectorById(tabId)), Drupal.settings);
          }
          else {
            Drupal.attachBehaviors($('div.assets-module-inner'), Drupal.settings);
          }
        }
      }
    };

    /**
     * Ajax delivery command to switch among tabs by ID.
     */
    Drupal.ajax.prototype.commands.assetWidgetGotoTab = function (ajax, response, status) {
      if (response.data) {
        assetWidget.gotoTabById(response.data);
      }
    };

    /**
     * Set params of current search.
     */
    Drupal.ajax.prototype.commands.assetWidgetSetFilterParams = function (ajax, response, status) {
      if (response.data) {
        assetWidget.filterParams = response.data;
      }
    };

    /**
     * Reset size mode view switcher.
     */
    Drupal.ajax.prototype.commands.assetWidgetResetSizeMode = function (ajax, response, status) {
      assetWidget.$widget.find(".tab").removeClass('view-x5');
    };

    /**
     * Ajax delivery command to show search params block.
     */
    Drupal.ajax.prototype.commands.assetWidgetShowFiltersBlock = function (ajax, response, status) {
      if (response.data) {
        // Set fresh HTML from response into holder.
        // We can avoid to use it, if refactor to append() and later replaceWith() method.
        // @todo: div.tab-contents-top-search is additional wrapper, and could be removed in JS and HTML.
        var $holder = assetWidget.$widget.find(".assets-content .tab-contents .tab-contents-top-search");
        $holder.html(response.data);
        // Bind appropriate events.
        assetWidget.viewSwitch($holder);
        assetWidget.modifySearchBind($holder);
        assetWidget.searchFiltersTooltipBind($holder);
      }
    };

    /**
     * Ajax delivery command to remove search params block.
     */
    Drupal.ajax.prototype.commands.assetWidgetRemoveFiltersBlock = function (ajax, response, status) {
      var $holder = assetWidget.$widget.find(".assets-content .tab-contents .tab-contents-top-search");
      $holder.html('');
    };

    /**
     * Ajax delivery command to show validation errors on search form.
     */
    Drupal.ajax.prototype.commands.assetWidgetFormErrors = function (ajax, response, status) {
      if (response.data) {
        var $errorsWrapper = assetWidget.$widget.find('div.messages');
        $errorsWrapper.html('');
        $errorsWrapper.addClass('error');

        var messages = [];
        var $element;
        $.each(response.data, function (key, value) {
          $element = assetWidget.$widget.find('input[name="' + key + '"]');
          if ($element.size()) {
            $element.addClass('error')
          }
          messages[messages.length] = value;
        });

        if (messages.length == 1) {
          $errorsWrapper.html(Drupal.t(messages[0]));
        }
        else {
          $ul = $('<ul>');
          for (var i in messages) {
            $ul.append('<li>' + Drupal.t(messages[i]) + '</li>');
          }
          $errorsWrapper.append($ul);
        }
        $errorsWrapper.show();
        assetWidget.scrollTop('search');
      }
    };

    /**
     * Ajax delivery command to fetch params of Async tab.
     */
    Drupal.ajax.prototype.commands.assetWidgetAddAsyncTab = function (ajax, response, status) {
      if (response.data) {
        assetWidget.asyncTabs = assetWidget.asyncTabs || {};
        $.each(response.data, function (key, value) {
          assetWidget.asyncTabs[key] = value;
        });
      }
    }

    /**
     * Ajax delivery command to put data into dropped reference field.
     */
    Drupal.ajax.prototype.commands.assetWidgetDropToField = function (ajax, response, status) {
      if (response.data && response.data.label && response.data.selector) {
        // Paste data.
        $('#' + response.data.selector).val(response.data.label);
      }
    };

    /**
     * Ajax delivery command to store dom id of specified tabs.
     */
    Drupal.ajax.prototype.commands.assetWidgetSetTabViewDomID = function (ajax, response, status) {
      if (response.data) {
        // To prevent changing of same listing because of full tab reload.
        assetWidget.tabDomIDs = assetWidget.tabDomIDs || {};
        $.each(response.data, function (key, value) {
          assetWidget.tabDomIDs[key] = value;
        });
      }
    };

    // We should override several default Drupal.Ajax callbacks to make possible operate with throbber i.e.
    Drupal.ajax.prototype.originEventResponse = Drupal.ajax.prototype.eventResponse;
    Drupal.ajax.prototype.eventResponse = function (element, event) {
      // Set flag for assets loader forms once per Ajax object.
      if (this.assetWidgetAjax == undefined) {
        this.assetWidgetAjax = assetWidget.isAssetWidgetView(this.options.data.view_dom_id);
      }

      // Prevent filters form submit if autocomplete is active.
      if (this.assetWidgetAjax && $('#autocomplete').size()) {
        return false;
      }
      return this.originEventResponse(element, event);
    };

    Drupal.ajax.prototype.originalBeforeSerialize = Drupal.ajax.prototype.beforeSerialize;
    Drupal.ajax.prototype.beforeSerialize = function (element, options) {
      // We should send type of ajax source to differentiate pager from filter.
      if (this.assetWidgetAjax) {
        // For now we handle only two types of actions.
        options.data.ajax_source = ($(this.element).is('input') ? 'filter' : 'pager');
      }
      this.originalBeforeSerialize(element, options);
    };

    Drupal.ajax.prototype.originalBeforeSend = Drupal.ajax.prototype.beforeSend;
    Drupal.ajax.prototype.beforeSend = function (xmlhttprequest, options) {
      if (this.assetWidgetAjax) {
        // Wipe default loader, we'll handle it manually.
        this.progress = {};
        assetWidget.hideTooltips();
        assetWidget.showTabLoader();
      }

      this.originalBeforeSend(xmlhttprequest, options);
    };

    Drupal.ajax.prototype.originalSuccess = Drupal.ajax.prototype.success;
    Drupal.ajax.prototype.success = function (response, status) {
      this.originalSuccess(response, status);

      // Only here we could apply behavior for both view ajax and ajax tab load.
      if (this.assetWidgetAjax) {
        assetWidget.controlsBind(assetWidget.$widget);
        assetWidget.scrollReinit();
        assetWidget.hideTabLoader(true);
      }
    };
  }

})(jQuery);
