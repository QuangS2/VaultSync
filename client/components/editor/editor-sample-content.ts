/**
 * Production-Ready Default Documents for VaultSync Workspace
 * Elegant, user-centric welcoming content without test artifacts or academic references.
 */

export const SAMPLE_DOCUMENTS: Record<string, string> = {
  'doc-welcome': `
    <h1>Chào mừng đến với VaultSync</h1>
    <p>
      <strong>VaultSync</strong> là không gian làm việc và ghi chú cộng tác thời gian thực, được xây dựng trên nền tảng <em>Bảo Mật Đầu-Cuối (Zero-Knowledge)</em>. Tất cả dữ liệu của bạn được mã hóa an toàn ngay tại thiết bị trước khi lưu trữ hoặc đồng bộ qua mạng.
    </p>
    
    <blockquote>
      <strong>Cam kết bảo mật riêng tư:</strong> Chỉ có bạn và những người được bạn chia sẻ mới có chìa khóa giải mã nội dung. Máy chủ trung gian hoàn toàn không thể đọc trộm bất kỳ ký tự nào của bạn.
    </blockquote>

    <h2>1. Các Tính Năng Nổi Bật</h2>
    <ul data-type="taskList" class="vaultsync-task-list">
      <li data-type="taskItem" data-checked="true" class="vaultsync-task-item"><label><input type="checkbox" checked="checked"><span></span></label><div><p><strong>Mã Hóa Quân Sự AES-256-GCM:</strong> Bảo vệ toàn diện từng dòng chữ và tệp tin.</p></div></li>
      <li data-type="taskItem" data-checked="true" class="vaultsync-task-item"><label><input type="checkbox" checked="checked"><span></span></label><div><p><strong>Đồng Bộ Thời Gian Thực:</strong> Cộng tác mượt mà cùng đồng nghiệp với con trỏ trực tiếp.</p></div></li>
      <li data-type="taskItem" data-checked="true" class="vaultsync-task-item"><label><input type="checkbox" checked="checked"><span></span></label><div><p><strong>Lưu Trữ Ngoại Tuyến (Offline-First):</strong> Tự động lưu trên máy, tiếp tục làm việc bình thường khi mất mạng.</p></div></li>
      <li data-type="taskItem" data-checked="true" class="vaultsync-task-item"><label><input type="checkbox" checked="checked"><span></span></label><div><p><strong>Cây Thư Mục Đa Tầng:</strong> Tổ chức tài liệu linh hoạt theo ý muốn.</p></div></li>
      <li data-type="taskItem" data-checked="true" class="vaultsync-task-item"><label><input type="checkbox" checked="checked"><span></span></label><div><p><strong>Bộ Ba Giao Diện:</strong> Chuyển đổi linh hoạt giữa Kem Sữa (Sun), Mây Trắng (Cloud) và Đêm Huyền Bí (Night).</p></div></li>
    </ul>

    <h2>2. Bảng Phím Tắt Nhanh Hữu Ích</h2>
    <p>Sử dụng các phím tắt sau để tăng tốc tối đa trải nghiệm soạn thảo của bạn:</p>
    <ul>
      <li><code>Ctrl + K</code> hoặc <code>Cmd + K</code>: Mở bảng điều khiển tìm kiếm &amp; lệnh nhanh.</li>
      <li><code>Ctrl + N</code>: Tạo ghi chú mới.</li>
      <li><code>Ctrl + Shift + N</code>: Tạo thư mục mới.</li>
      <li><code>Ctrl + B</code>: Thu gọn hoặc mở rộng thanh điều hướng bên trái.</li>
      <li><code>Ctrl + Shift + L</code>: Khóa kho lưu trữ tức thì để bảo vệ quyền riêng tư.</li>
      <li><code>Alt + 1 / 2 / 3</code>: Chuyển đổi nhanh 3 chế độ màu sắc.</li>
    </ul>
  `,

  'doc-quickstart': `
    <h1>Hướng Dẫn Sử Dụng Nhanh</h1>
    <p>
      Khám phá các thao tác cơ bản để làm chủ không gian làm việc VaultSync trong chưa đầy 2 phút.
    </p>

    <h2>1. Soạn Thảo Phong Phú</h2>
    <p>
      Hỗ trợ đầy đủ các định dạng văn bản nâng cao: tiêu đề, danh sách công việc (Task List), trích dẫn, bảng và khối mã nguồn chuyên nghiệp.
    </p>

    <h2>2. Chia Sẻ Tài Liệu Bảo Mật</h2>
    <p>
      Nhấp vào nút <strong>Chia Sẻ</strong> trên thanh tiêu đề để cấp quyền truy cập tài liệu cho thành viên khác thông qua Khóa công khai của họ.
    </p>

    <h2>3. Xuất &amp; Sao Lưu Dữ Liệu</h2>
    <p>
      Bạn luôn sở hữu 100% dữ liệu của mình. Sử dụng tính năng <strong>Xuất File</strong> để tải về định dạng Markdown (<code>.md</code>), trang web độc lập (<code>.html</code>) hoặc tệp sao lưu toàn bộ kho lưu trữ (<code>.vault</code>).
    </p>
  `,

  'doc-shortcuts': `
    <h1>Bảng Phím Tắt Tiện Ích</h1>
    <p>Danh sách đầy đủ các phím tắt được thiết kế công thái học:</p>

    <h2>Điều Hướng &amp; Không Gian Làm Việc</h2>
    <ul>
      <li><code>Ctrl + B</code>: Đóng / Mở thanh điều hướng cây thư mục.</li>
      <li><code>Ctrl + Shift + D</code>: Đóng / Mở khung thảo luận &amp; bình luận.</li>
      <li><code>Ctrl + K</code>: Mở Command Palette điều khiển toàn bộ ứng dụng.</li>
    </ul>

    <h2>Quản Lý Tài Liệu &amp; Bảo Mật</h2>
    <ul>
      <li><code>Ctrl + N</code>: Tạo ghi chú mới trong thư mục hiện tại.</li>
      <li><code>Ctrl + Shift + N</code>: Tạo thư mục mới.</li>
      <li><code>Ctrl + Shift + L</code>: Khóa tức thì kho lưu trữ.</li>
      <li><code>Alt + 1</code>: Giao diện Kem Sữa (Sun).</li>
      <li><code>Alt + 2</code>: Giao diện Mây Trắng Xám (Cloud).</li>
      <li><code>Alt + 3</code>: Giao diện Đêm Huyền Bí (Night).</li>
    </ul>
  `,

  'doc-ideas': `
    <h1>Ý Tưởng &amp; Kế Hoạch Cá Nhân</h1>
    <p>Không gian riêng tư để phác thảo các ý tưởng và dự án sắp tới của bạn.</p>

    <h2>Mục Tiêu Tháng Này</h2>
    <ul data-type="taskList" class="vaultsync-task-list">
      <li data-type="taskItem" data-checked="false" class="vaultsync-task-item"><label><input type="checkbox"><span></span></label><div><p>Hoàn thành bản thảo tài liệu dự án.</p></div></li>
      <li data-type="taskItem" data-checked="false" class="vaultsync-task-item"><label><input type="checkbox"><span></span></label><div><p>Chia sẻ tài liệu cho nhóm cộng tác.</p></div></li>
      <li data-type="taskItem" data-checked="false" class="vaultsync-task-item"><label><input type="checkbox"><span></span></label><div><p>Sao lưu dữ liệu định kỳ vào tệp .vault.</p></div></li>
    </ul>
  `
};
