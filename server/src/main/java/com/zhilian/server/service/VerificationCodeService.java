package com.zhilian.server.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.zhilian.server.entity.VerificationCode;
import com.zhilian.server.mapper.VerificationCodeMapper;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Random;

@Service
public class VerificationCodeService {

    private final VerificationCodeMapper codeMapper;

    public VerificationCodeService(VerificationCodeMapper codeMapper) {
        this.codeMapper = codeMapper;
    }

    public String generateCode(String target, String purpose) {
        // 撤销旧有效验证码
        LambdaQueryWrapper<VerificationCode> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(VerificationCode::getTarget, target)
               .eq(VerificationCode::getPurpose, purpose)
               .eq(VerificationCode::getUsed, 0)
               .gt(VerificationCode::getExpiresAt, LocalDateTime.now());
        codeMapper.selectList(wrapper).forEach(c -> {
            c.setUsed(1);
            codeMapper.updateById(c);
        });

        String code = String.format("%06d", new Random().nextInt(1000000));
        VerificationCode vc = new VerificationCode();
        vc.setTarget(target);
        vc.setPurpose(purpose);
        vc.setCode(code);
        vc.setExpiresAt(LocalDateTime.now().plusMinutes(10));
        vc.setUsed(0);
        vc.setCreatedAt(LocalDateTime.now());
        codeMapper.insert(vc);
        return code;
    }

    public boolean verify(String target, String purpose, String code) {
        LambdaQueryWrapper<VerificationCode> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(VerificationCode::getTarget, target)
               .eq(VerificationCode::getPurpose, purpose)
               .eq(VerificationCode::getCode, code)
               .eq(VerificationCode::getUsed, 0)
               .gt(VerificationCode::getExpiresAt, LocalDateTime.now())
               .orderByDesc(VerificationCode::getCreatedAt)
               .last("LIMIT 1");
        VerificationCode vc = codeMapper.selectOne(wrapper);
        if (vc == null) return false;
        vc.setUsed(1);
        codeMapper.updateById(vc);
        return true;
    }

    /** 模拟发送短信/邮件验证码（实际集成需替换此方法） */
    public void send(String target, String purpose, String code) {
        // TODO: 接入短信/邮件服务商
        System.out.println("[VerificationCode] Send to " + target + " [" + purpose + "]: " + code);
    }
}
