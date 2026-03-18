package com.zhilian.server.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.zhilian.server.entity.UserAuth;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface UserAuthMapper extends BaseMapper<UserAuth> {
}
