package com.zhilian.server.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.zhilian.server.entity.Bookmark;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface BookmarkMapper extends BaseMapper<Bookmark> {
}
