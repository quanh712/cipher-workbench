# Public release: local → dev → staging → main

Ứng dụng public dùng **một Docker image** chứa React đã build và FastAPI, cùng
origin. Có hai Render Web Service riêng: staging và production. Cả hai dùng Free
plan, không database, không lưu lịch sử trên server. Lịch sử trên trình duyệt do
frontend quản lý. Repository và image GHCR đều phải **private**.

## Luồng phát hành

1. Làm tính năng trên nhánh local, chạy kiểm tra rồi đưa vào `dev`. Workflow
   `Checks` chạy lint, unit test, build FE và test BE trên Python 3.12.
2. Đưa commit muốn nghiệm thu từ `dev` sang `staging` bằng fast-forward hoặc merge.
   Chạy thủ công **Build and test staging** trên nhánh `staging`.
3. Workflow chạy lại checks, build một image Linux amd64, push GHCR private, chạy
   Playwright với chính image đó và API thật, rồi deploy digest lên staging qua
   Render API. Chỉ khi deploy `live`, digest đúng, `/api/release` đúng Git SHA,
   health, trang React và Caesar API qua smoke test, rồi chạy Playwright trên staging
   thật thành công mới lưu `staging-release`.
4. Kiểm tra thủ công staging: mobile, upload/download, từng thuật toán và lịch sử
   tại trình duyệt. Nếu cần sửa, quay về `dev` và tạo vòng staging mới.
5. Đưa **đúng cây source đã nghiệm thu** vào `main`, giữ commit staging trong
   ancestry; dùng fast-forward hoặc merge, không squash/rebase commit đã test.
6. Chạy thủ công **Promote tested image to production** trên `main`, nhập run ID
   staging và gõ `production`. Workflow kiểm tra run staging thành công, artifact
   thuộc đúng repo/run/SHA/service, ancestry và toàn bộ Git tree bằng nhau. Nó
   kiểm tra staging còn chạy đúng revision rồi deploy **cùng digest**, không build
   lại. Sau đó xác minh production giống staging.

Push/merge vào `main` **không tự deploy**. Nếu `main` có thêm bất kỳ thay đổi nào
so với bản staged, promotion dừng: đưa thay đổi đó qua một vòng staging mới.
Hai workflow deploy dùng concurrency riêng và không hủy deployment đang chạy.

## Bootstrap một lần

### GitHub và private GHCR

Repository dự kiến: `quanh712/cipher-workbench`, private. GitHub chỉ cho dispatch
workflow có mặt trên default branch. Lần đầu cài workflow lên `main` bằng commit
thiết lập CI; đây là bước cài tooling, không triển khai ứng dụng. Sau đó merge
thiết lập đó vào `dev` và `staging`. Giữ `main` làm default branch.

Chạy **Build and test staging** trên `staging` với `bootstrap_only=true` để tạo
image đầu tiên. Chế độ này vẫn chạy checks và browser test, chỉ build/push image;
không gọi Render và **không tạo artifact đủ điều kiện promote**. Digest xuất hiện
trong GitHub Actions summary.

GHCR tạo package mới private theo mặc định. Workflow kiểm tra repo private và
package hiện hữu private trước push, rồi kiểm tra package private sau push. Không
đổi visibility package sang public. Bật quyền Actions read/write packages cho repo;
package cần cho phép repository này truy cập qua `GITHUB_TOKEN` nếu quyền không tự
được kế thừa. Token workflow chỉ có hiệu lực trong job và không dùng làm credential
Render lâu dài.

### Render Dashboard

Có thể tự động hóa **chỉ bước tạo staging** bằng CLI chuẩn thư viện Python. CLI
mặc định dry-run, không đọc credentials và không gọi mạng:

```bash
python3 deploy/bootstrap-render.py --image ghcr.io/quanh712/cipher-workbench@sha256:DIGEST
```

Đặt `RENDER_API_KEY` và `GHCR_READ_TOKEN` vào
`~/.config/cipher-workbench/render.env` (giá trị literal `KEY=value`, không shell
expansion). `GHCR_READ_TOKEN` là PAT có `read:packages` cho package private; không
dùng token Actions ngắn hạn. Sau khi đối chiếu digest với bootstrap CI thành công:

```bash
python3 deploy/bootstrap-render.py \
  --image ghcr.io/quanh712/cipher-workbench@sha256:DIGEST \
  --apply --output /tmp/cipher-render-staging.json
```

Thay `DIGEST` bằng 64 ký tự hex thực, không paste token vào command. CLI tự chọn
workspace chỉ khi API key thấy đúng một owner; nếu có nhiều owner, thêm
`--owner-id ID` lấy từ workspace mong muốn. Nó tạo registry credential và một
`web_service` có **plan free**, Singapore, một instance, image pinned, không disk/
database. Không tự chuyển sang paid plan nếu API từ chối Free.

Chạy lại sẽ tìm service theo owner và tên cố định `cipher-workbench-staging`, kiểm
tra cấu hình Free/image/private-registry rồi trả ID/URL; không thay image hoặc
sửa service đang tồn tại. Service cấu hình khác gây lỗi trước khi tạo credential.
Nếu credential đã tồn tại đúng tên/registry/account, CLI dùng lại mà không đổi
PAT. Credential cũ hết hạn cần cập nhật riêng trong Dashboard. Nếu tạo service
thất bại sau khi tạo credential, lần chạy lại sẽ dùng credential vừa tạo.

**CLI không tạo production.** Bootstrap service bắt đầu deploy ngay sau POST;
production chỉ tạo bằng Dashboard ở bước 3 sau khi staging đã thực sự qua test.
CLI không tự chứng minh digest thuộc CI run: người chạy lấy đúng digest từ run
bootstrap thành công. ID deploy trả về chưa có nghĩa deploy thành công; tiếp tục
cấu hình workflow staging và chờ artifact nghiệm thu như luồng phát hành ở trên.
Không chạy đồng thời hai lần bootstrap.

1. Tạo registry credential tên `cipher-workbench-ghcr`, chọn GitHub Container
   Registry, username `quanh712`, PAT chỉ cấp quyền cần thiết `read:packages` và
   có quyền đọc package private. Cất PAT trong Render, không trong source hoặc
   Actions artifact. Xem [hướng dẫn private image của Render](https://render.com/docs/deploy-an-image).
2. Tạo **staging** Web Service bằng **Existing Image**, dùng URL private có digest
   bootstrap, Free plan, region Singapore, health path `/api/health`. Cấu hình:
   `DATABASE_URL` rỗng, `HISTORY_API_ENABLED=false`, `HISTORY_COOKIE_SECURE=true`.
   Không gắn disk hoặc database. Không thêm build/start command; dùng CMD của image.
3. Tạo **production** tương tự, nhưng chỉ sau khi digest đó đã được nghiệm thu trên
   staging; thao tác tạo service khởi chạy image ngay. Không tạo production bằng
   một image chưa test. Sau bootstrap, phát hành qua workflow promotion.
4. Ghi lại hai service ID `srv-…` và HTTPS URL thật từ Dashboard. Không giả định URL
   theo tên service, vì tên có thể đã được dùng.

`render.yaml` là bản tham chiếu cho hai service. Hai digest toàn số 0 là placeholder
cố ý, phải thay bằng digest bootstrap khi dùng. Không apply file nguyên trạng và
không đồng bộ Blueprint tự động để điều khiển image production; workflow release
là nơi duy nhất thực hiện các lần phát hành thường lệ. Tạo service bằng Dashboard
cho phép nghiệm thu staging trước khi tạo production.

Image-backed service không tự deploy khi tag đổi; workflow gửi `imageUrl` chứa
digest tới `POST /v1/services/{serviceId}/deploys` và polling deployment ID riêng.
Image repository phải trùng cấu hình service. Một deploy override không đổi image
mặc định trong settings: không dùng nút Deploy Latest/đường deploy khác để phát
hành, vì có thể chạy lại image bootstrap. Không xóa các digest đang phục vụ hoặc
muốn rollback; Render cần pull lại khi restart/chuyển máy.

### GitHub Actions settings

Thêm repository **secret**:

| Tên | Nội dung |
| --- | --- |
| `RENDER_API_KEY` | API key của tài khoản có quyền deploy hai service |

Thêm repository **variables**:

| Tên | Nội dung |
| --- | --- |
| `RENDER_STAGING_SERVICE_ID` | Service ID staging |
| `RENDER_STAGING_URL` | HTTPS origin staging, không trailing slash |
| `RENDER_PRODUCTION_SERVICE_ID` | Service ID production |
| `RENDER_PRODUCTION_URL` | HTTPS origin production, không trailing slash |

Không ghi giá trị credential vào repo, URL, issue, workflow input hoặc artifact.
Script không in token hay body lỗi provider. Không cần GitHub Environment approval
hoặc tính năng bảo vệ nhánh trả phí để chạy luồng này; quyền chạy workflow/push cần
giới hạn cho người được tin cậy. Manual dispatch + branch/source/evidence gates là
kiểm tra trong pipeline, không ngăn người có quyền quản trị bỏ qua workflow bằng
Render Dashboard/API. Có thể bật branch rules khi gói tài khoản hỗ trợ.

Chạy sau khi đã cấu hình:

```bash
gh workflow run staging.yml --ref staging
gh run list --workflow staging.yml
# Nghiệm thu staging, rồi đưa đúng cây source đó lên main.
gh workflow run production.yml --ref main \
  -f staging_run_id=RUN_ID -f confirmation=production
```

Nếu artifact hết hạn sau 30 ngày, chạy staging lại. Artifact chỉ có digest, revision,
service/deploy ID, URL và trạng thái test; không chứa source, image hay credentials.
Artifact nằm trong private GitHub repo, không publish GitHub Pages hoặc image public.

## Kiểm tra local

```bash
cd frontend
npm ci
npm run lint
npm run test
npm run build
cd ../backend
uv sync --frozen
uv run ruff check .
uv run pytest
cd ..
python3 -m unittest discover -s deploy/tests -v
```

Test PostgreSQL legacy bỏ qua khi không có `TEST_DATABASE_URL`; public runtime không
dùng PostgreSQL. Browser test production chạy với config
`frontend/playwright.public.config.ts` và `PLAYWRIGHT_BASE_URL` trỏ tới image local.

## Giới hạn miễn phí và rollback

Render Free ngủ sau 15 phút không có traffic; mở lại thường mất khoảng một phút.
Filesystem bị mất khi redeploy/restart/ngủ, không có persistent disk. Workspace có
750 Free instance hours/tháng **dùng chung các service**: hai service không thể
cùng chạy liên tục cả tháng. Staging chỉ chạy khi nghiệm thu, không dùng uptime
ping để giữ thức. Hết quota có thể tạm ngừng cả hai; giám sát usage và băng thông
trong Dashboard. Xem [Free limits](https://render.com/docs/free).

GitHub Actions private repo cũng có quota minutes/storage; chạy workflow thủ công
giúp hạn chế build không cần thiết. Xem usage trước khi bật chi tiêu vượt quota.
Không có cam kết uptime hoặc chi phí luôn bằng 0 khi tài khoản vượt mức miễn phí.

Rollback không rebuild tag: chọn digest trước đã nghiệm thu và còn trong GHCR.
Với quy trình có kiểm soát, đưa đúng revision/cây source đó lại qua staging và
promotion; thao tác rollback khẩn qua Dashboard cần người quản trị kiểm tra digest
và `/api/release`, ghi lại quyết định. Không tự dùng API deploy thông thường để
bỏ qua cổng nghiệm thu. Vì không có dữ liệu server, không có migration/restore DB.

## Tham chiếu API/format

- [Render deploy prebuilt images](https://render.com/docs/deploy-an-image)
- [Render Blueprint spec](https://render.com/docs/blueprint-spec)
- [Render CLI deploy implementation](https://github.com/render-oss/cli/blob/main/pkg/deploy/repo.go)
- [Render API generated request/deploy types](https://github.com/render-oss/cli/blob/main/pkg/client/types_gen.go)

Đã đối chiếu `imageUrl` request và `deploy.image.ref` với nguồn chính thức; chưa
ngầm coi kiểm tra offline là một lần deploy Render thành công. Lần đầu chạy thật
chỉ hoàn tất khi artifact staging và production workflow xác nhận các service live.
