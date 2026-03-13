package com.zhilian.server.dto;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.Data;

import java.util.List;

@Data
public class PageData<T> {
    private List<T> records;
    private long total;
    private long pageNum;
    private long pageSize;
    private long totalPages;

    public static <T> PageData<T> from(Page<T> page) {
        PageData<T> data = new PageData<>();
        data.setRecords(page.getRecords());
        data.setTotal(page.getTotal());
        data.setPageNum(page.getCurrent());
        data.setPageSize(page.getSize());
        data.setTotalPages(page.getPages());
        return data;
    }
}
