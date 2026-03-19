package com.zhilian.server.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.zhilian.server.common.ErrorCode;
import com.zhilian.server.entity.Note;
import com.zhilian.server.exception.BizException;
import com.zhilian.server.mapper.NoteMapper;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class NoteService {

    private final NoteMapper noteMapper;

    public NoteService(NoteMapper noteMapper) {
        this.noteMapper = noteMapper;
    }

    public List<Note> getNotes(Long bookmarkId, Long userId) {
        LambdaQueryWrapper<Note> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Note::getBookmarkId, bookmarkId)
               .eq(Note::getUserId, userId)
               .orderByDesc(Note::getCreatedAt);
        return noteMapper.selectList(wrapper);
    }

    public Note createNote(Long bookmarkId, Long userId, String content) {
        if (content == null || content.isBlank()) {
            throw new BizException(ErrorCode.BAD_REQUEST, "笔记内容不能为空");
        }
        Note note = new Note();
        note.setBookmarkId(bookmarkId);
        note.setUserId(userId);
        note.setContent(content.trim());
        note.setCreatedAt(LocalDateTime.now());
        note.setUpdatedAt(LocalDateTime.now());
        noteMapper.insert(note);
        return note;
    }

    public void updateNote(Long noteId, Long userId, String content) {
        Note existing = noteMapper.selectById(noteId);
        if (existing == null || !existing.getUserId().equals(userId)) {
            throw new BizException(ErrorCode.NOT_FOUND, "笔记不存在");
        }
        if (content == null || content.isBlank()) {
            throw new BizException(ErrorCode.BAD_REQUEST, "笔记内容不能为空");
        }
        existing.setContent(content.trim());
        existing.setUpdatedAt(LocalDateTime.now());
        noteMapper.updateById(existing);
    }

    public void deleteNote(Long noteId, Long userId) {
        Note existing = noteMapper.selectById(noteId);
        if (existing == null || !existing.getUserId().equals(userId)) {
            throw new BizException(ErrorCode.NOT_FOUND, "笔记不存在");
        }
        noteMapper.deleteById(noteId);
    }
}
