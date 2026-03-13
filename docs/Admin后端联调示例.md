# Admin 后端联调示例

以下示例默认后端地址：`http://localhost:8080`

## 1) 登录并提取 token

```bash
curl -X POST "http://localhost:8080/api/admin/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

返回示例中 `data.token` 即为后续请求所需 JWT。

## 2) 系统设置（仅超级管理员）

```bash
curl "http://localhost:8080/api/admin/settings" \
  -H "Authorization: Bearer <TOKEN>"
```

```bash
curl -X PUT "http://localhost:8080/api/admin/settings" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"settings":{"theme.defaultMode":"light","ai.enabled":"true"}}'
```

## 3) 收藏导出（支持筛选）

```bash
curl -L "http://localhost:8080/api/admin/bookmarks/export?keyword=react&categoryId=1&userId=2" \
  -H "Authorization: Bearer <TOKEN>" \
  -o bookmarks.csv
```

## 3.1) 发现内容导出（支持筛选 + 排序）

```bash
curl -L "http://localhost:8080/api/admin/discover/export?status=visible&sortField=sort&sortOrder=asc" \
  -H "Authorization: Bearer <TOKEN>" \
  -o discover.csv
```

## 3.2) 文章导出（支持筛选 + 排序）

```bash
curl -L "http://localhost:8080/api/admin/articles/export?type=article&sortField=createdAt&sortOrder=desc" \
  -H "Authorization: Bearer <TOKEN>" \
  -o articles.csv
```

## 4) 用户状态变更

```bash
curl -X PUT "http://localhost:8080/api/admin/users/2/status?status=disabled" \
  -H "Authorization: Bearer <TOKEN>"
```

## 5) 分类排序

```bash
curl -X PUT "http://localhost:8080/api/admin/categories/3/sort?sort=1" \
  -H "Authorization: Bearer <TOKEN>"
```

## 6) 发现内容新增

```bash
curl -X POST "http://localhost:8080/api/admin/discover" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"categoryId":4,"title":"Spring 官方文档","url":"https://spring.io/projects/spring-boot","status":"visible"}'
```

## 7) 文章新增

```bash
curl -X POST "http://localhost:8080/api/admin/articles" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"bookmarkId":1,"title":"MyBatis Plus 指南","url":"https://baomidou.com","type":"article"}'
```

## 8) 列表统一排序参数示例

```bash
curl "http://localhost:8080/api/admin/users?pageNum=1&pageSize=10&sortField=createdAt&sortOrder=desc" \
  -H "Authorization: Bearer <TOKEN>"
```

`sortOrder` 支持 `asc|desc|ascend|descend`。

## 9) 分页返回结构（统一）

所有分页接口的 `data` 统一为：

```json
{
  "records": [],
  "total": 0,
  "pageNum": 1,
  "pageSize": 10,
  "totalPages": 0
}
```
