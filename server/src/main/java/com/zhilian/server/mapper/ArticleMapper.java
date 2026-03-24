package com.zhilian.server.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.zhilian.server.entity.Article;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface ArticleMapper extends BaseMapper<Article> {
}
