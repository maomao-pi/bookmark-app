package com.zhilian.server.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.zhilian.server.entity.Note;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface NoteMapper extends BaseMapper<Note> {
}
