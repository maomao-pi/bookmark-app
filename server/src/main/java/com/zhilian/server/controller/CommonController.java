package com.zhilian.server.controller;

import com.zhilian.server.dto.ApiResponse;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Base64;
import java.util.UUID;

@RestController
@RequestMapping("/api/common")
public class CommonController {

    private static final String UPLOAD_DIR = System.getProperty("user.dir") + "/uploads/icons/";

    /**
     * 上传base64图片并保存到本地文件
     * @param imageData base64编码的图片数据（不包含data:image/png;base64,前缀）
     * @param filename  可选的文件名，如果不提供则自动生成
     * @return 文件访问URL路径
     */
    @PostMapping("/upload-icon")
    public ApiResponse<String> uploadIcon(
            @RequestBody IconUploadRequest request) {
        try {
            // 确保目录存在
            Path uploadPath = Paths.get(UPLOAD_DIR);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            // 生成唯一文件名
            String originalFilename = request.getFilename();
            String extension = getExtensionFromDataUrl(request.getImageData());
            if (extension == null) {
                extension = "png";
            }
            String filename = UUID.randomUUID().toString().replace("-", "") + "." + extension;
            if (originalFilename != null && !originalFilename.isBlank()) {
                // 使用原始文件名（去掉路径和危险字符）
                String safeName = originalFilename.replaceAll("[^a-zA-Z0-9.-]", "_");
                filename = safeName;
            }

            // 解码并保存文件
            String base64Data = request.getImageData();
            // 去除可能存在的 data:image/png;base64, 前缀
            if (base64Data.contains(",")) {
                base64Data = base64Data.split(",")[1];
            }
            byte[] imageBytes = Base64.getDecoder().decode(base64Data);

            Path filePath = uploadPath.resolve(filename);
            Files.write(filePath, imageBytes);

            // 返回可访问的URL路径
            String urlPath = "/uploads/icons/" + filename;
            return ApiResponse.success(urlPath);

        } catch (IllegalArgumentException e) {
            return ApiResponse.error(400, "无效的base64图片数据: " + e.getMessage());
        } catch (IOException e) {
            return ApiResponse.error(500, "保存图片文件失败: " + e.getMessage());
        } catch (Exception e) {
            return ApiResponse.error(500, "上传失败: " + e.getMessage());
        }
    }

    private String getExtensionFromDataUrl(String dataUrl) {
        if (dataUrl == null) return null;
        if (dataUrl.contains("image/png")) return "png";
        if (dataUrl.contains("image/jpeg") || dataUrl.contains("image/jpg")) return "jpg";
        if (dataUrl.contains("image/gif")) return "gif";
        if (dataUrl.contains("image/webp")) return "webp";
        return null;
    }

    /**
     * 上传multipart文件
     */
    @PostMapping("/upload")
    public ApiResponse<String> uploadFile(@RequestParam("file") MultipartFile file) {
        try {
            Path uploadPath = Paths.get(UPLOAD_DIR);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            String originalFilename = file.getOriginalFilename();
            String extension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                extension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }
            String filename = UUID.randomUUID().toString().replace("-", "") + extension;

            Path filePath = uploadPath.resolve(filename);
            Files.write(filePath, file.getBytes());

            String urlPath = "/uploads/icons/" + filename;
            return ApiResponse.success(urlPath);
        } catch (IOException e) {
            return ApiResponse.error(500, "上传文件失败: " + e.getMessage());
        }
    }

    @lombok.Data
    public static class IconUploadRequest {
        private String imageData;  // base64编码的图片数据
        private String filename;   // 可选的文件名
    }
}
