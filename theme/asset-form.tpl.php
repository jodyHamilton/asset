<div id='page-title'><div class='limiter clearfix'>
  <h1 class='page-title<?php if (!empty($page_icon_class)) print ' ' . $page_icon_class; ?>'>
    <?php if (!empty($page_icon_class)): ?><span class='icon'></span><?php endif; ?>
    <?php if ($title) print $title; ?>
  </h1>
</div></div>

<?php if ($show_messages && $messages): ?>
<div id='console'><div class='limiter clearfix'><?php print $messages; ?></div></div>
<?php endif; ?>

<div id='page'><div id='main-content' class='limiter clearfix'>
  <?php if (!empty($page['help'])) print render($page['help']); ?>
  <div id='content' class='page-content clearfix'>
    <?php if (!empty($page['content'])) print render($page['content']); ?>
  </div>
</div></div>
