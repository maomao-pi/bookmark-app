package com.zhilian.server.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.zhilian.server.entity.VerificationCode;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface VerificationCodeMapper extends BaseMapper<VerificationCode> {
}
