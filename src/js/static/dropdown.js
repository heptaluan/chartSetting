$.fn.dropdown = function (cfg) {
  this.options = {
    list: cfg && cfg.list ? cfg.list : [],
    index: cfg && cfg.index ? cfg.index : 0,
    callback: cfg && cfg.callback ? cfg.callback : null,
    updateIndex: cfg && cfg.updateIndex ? cfg.updateIndex : false,
    bindClick: cfg.bindClick ? cfg.bindClick : false
  };

  var $dropdown = $(this);

  var list = this.options.list;
  var callback = this.options.callback;
  var index = this.options.index;
  var updateIndex = this.options.updateIndex;
  var bindClick = this.options.bindClick;

  // 根据列表生成下拉框，如果传递
  if (!updateIndex) {
    var createDropdown = function(list) {
      let dropdownList = `
        <div class="drop-down-box">
        <div class="dropdown-title">${index ? list[index] : list[0]}</div>
        <ul class="dropdown-ul">
      `
      for (let i = 0; i < list.length; i++) {
        dropdownList += `
          <li class="dropdown-li">${list[i]}</li>
        `
      }
      dropdownList += '</ul></div>'
      return dropdownList;
    }
  
    // 渲染
    $dropdown.append(createDropdown(list))
  }

  // 如果 setIndex 存在，则设置默认选中项
  if (index || updateIndex) {
    $dropdown.find('.dropdown-title').html(list[index])
  }

  if (bindClick) {
    // 显示下拉
    $dropdown.bind('click', '.dropdown-title', (e) => {
      // $(this).find('.dropdown-ul').show().siblings('.dropdown-title').addClass('open');
      const targetNode = e.target.classList.contains('dropdown-title') ? e.target : e.target.parentNode;
      if (targetNode.className.split(' ').indexOf('open') > -1) {
        $(targetNode).next('.dropdown-ul').hide();
        $(targetNode).removeClass('open');
      } else {
        $(targetNode).next('.dropdown-ul').show();
        $(targetNode).addClass('open');
      }
    })
  }

  // 隐藏下拉
  $(document).mouseup(function(e){
    // var _con = $('.dropdown-ul');
    // if (!_con.is(e.target) && _con.has(e.target).length === 0) {
    //   _con.hide().siblings('.dropdown-title').removeClass('open')
    // }
    // 点击下拉框里的东西，如果当前是开的就关闭下拉框
    if (Array.from($('.dropdown-ul')).indexOf(e.target) === -1 && Array.from($('.dropdown-title')).indexOf(e.target) === -1 && Array.from($('.theme-color-zone')).indexOf(e.target) === -1) {
      if (Array.from($('.dropdown-title.open')).length > 0) {
        $('.dropdown-title.open').siblings('.dropdown-ul').hide();
        $('.dropdown-title.open').removeClass('open');
      }
    }
  });

  // 列表点击
  $dropdown.find('.dropdown-li').click(function(e) {
    e.stopPropagation()
    $(this).parent().hide().siblings('.dropdown-title').html($(this).html()).removeClass('open')
    if ($.isFunction(callback)) {
      callback($(this).index());
    }
  })


};