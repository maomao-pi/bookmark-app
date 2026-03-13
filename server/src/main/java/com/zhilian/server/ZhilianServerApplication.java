package com.zhilian.server;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@MapperScan("com.zhilian.server.mapper")
public class ZhilianServerApplication {
    
    public static void main(String[] args) {
        SpringApplication.run(ZhilianServerApplication.class, args);
    }
}
