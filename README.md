# FoodiePop — Game Design Report

Bộ tài liệu phân tích thiết kế game FoodiePop, dựa trên cấu hình đóng gói của bản APK **v1.5b4t**. Cập nhật ngày **20/10/2026**.

## Cách xem

1. Tải [FoodiePop-Report.zip](FoodiePop-Report.zip) rồi giải nén; hoặc tải repository bằng **Code → Download ZIP**.
2. Mở **LevelDesign.html** bằng trình duyệt.
3. Giữ nguyên cấu trúc thư mục để hình ảnh và các bảng tương tác hoạt động. Tài liệu đọc hoàn toàn ngoại tuyến.

## Nội dung

| Tab | Nội dung |
| --- | --- |
| Game Design | Tổng quan vòng chơi và cấu trúc thiết kế |
| Chi tiết level | Khách hàng, món ăn, công thức, số lượng và hình ảnh nguyên liệu theo level |
| Món & nguyên liệu | Danh mục món, thành phần và hình ảnh |
| Booster | Công dụng, cấu hình và hình ảnh booster |
| IAP & cửa hàng | Chi tiết 22 gói, từng loại phần thưởng và số lượng |
| Events | Nhiệm vụ, mốc tiến trình, phần thưởng và hình ảnh |
| Leaderboard | Người chơi, đội, thi đấu tuần và công thức điểm |
| Hằng ngày | Thưởng đăng nhập và quảng cáo theo mốc |
| Analytics | 37 event/nhóm tên event, payload, mục đích, điều kiện và nơi phát trong mã |

## Phạm vi phân tích

Các giá trị phản ánh cấu hình và mã trong bản APK đã phân tích; dữ liệu máy chủ và trạng thái tài khoản có thể thay đổi. Các tính năng chỉ thấy trong thư viện dùng chung được ghi rõ, không mặc định đang hoạt động trong FoodiePop. Tên event có trong mã không chứng minh event đã được máy chủ analytics tiếp nhận.

Repository chứa báo cáo HTML, JavaScript, CSS, hình ảnh minh họa và bản ZIP để đọc ngoại tuyến. Không bao gồm APK, thư viện công cụ, binary game, dump hoặc dữ liệu tài khoản.
