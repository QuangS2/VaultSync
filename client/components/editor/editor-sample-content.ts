/**
 * Production Default Documents for VaultSync Workspace
 * Practical, concise, and useful notes for daily usage and collaboration.
 */

export const SAMPLE_DOCUMENTS: Record<string, string> = {
  'doc-quicknotes': `
    <h1>📝 Ghi Chú Nhanh & Việc Cần Làm</h1>
    <p>
      Chào mừng bạn đến với <strong>VaultSync</strong> — ứng dụng ghi chú cá nhân và cộng tác bảo mật chuẩn <em>Mã Hóa Đầu-Cuối (Zero-Knowledge)</em>.
    </p>

    <h2>Danh Sách Việc Cần Làm Hôm Nay</h2>
    <ul data-type="taskList" class="vaultsync-task-list">
      <li data-type="taskItem" data-checked="true" class="vaultsync-task-item">
        <label><input type="checkbox" checked="checked"><span></span></label>
        <div><p>Khởi tạo kho lưu trữ bảo mật với mật khẩu chủ.</p></div>
      </li>
      <li data-type="taskItem" data-checked="true" class="vaultsync-task-item">
        <label><input type="checkbox" checked="checked"><span></span></label>
        <div><p>Ghi lại 12 từ khóa khôi phục bí mật ở nơi an toàn.</p></div>
      </li>
      <li data-type="taskItem" data-checked="false" class="vaultsync-task-item">
        <label><input type="checkbox"><span></span></label>
        <div><p>Thử nghiệm tính năng tạo ghi chú mới (<code>Ctrl + N</code>).</p></div>
      </li>
      <li data-type="taskItem" data-checked="false" class="vaultsync-task-item">
        <label><input type="checkbox"><span></span></label>
        <div><p>Chia sẻ tài liệu cho đồng nghiệp qua liên kết 1 chạm.</p></div>
      </li>
    </ul>

    <h2>Phím Tắt Nhanh Hữu Dụng</h2>
    <ul>
      <li><code>Ctrl + K</code>: Mở thanh tìm kiếm lệnh nhanh Spotlight.</li>
      <li><code>Ctrl + N</code>: Tạo tài liệu ghi chú mới.</li>
      <li><code>Ctrl + B</code>: Đóng / Mở thanh thư mục bên trái.</li>
      <li><code>Ctrl + Shift + L</code>: Khóa kho lưu trữ tức thì khi rời máy (AFK).</li>
    </ul>
  `,

  'doc-collab-guide': `
    <h1>🤝 Hướng Dẫn Mời Bạn Bè & Cộng Tác</h1>
    <p>
      VaultSync cho phép bạn và đồng nghiệp cùng soạn thảo trên một tài liệu theo thời gian thực với độ trễ dưới 20ms mà không làm lộ nội dung cho máy chủ trung gian.
    </p>

    <h2>3 Bước Đơn Giản Để Bắt Đầu:</h2>
    <ol>
      <li>
        <strong>Bước 1:</strong> Nhấp vào nút <strong>"Chia Sẻ"</strong> (biểu tượng mũi tên chia sẻ) trên thanh tiêu đề phía trên bên phải.
      </li>
      <li>
        <strong>Bước 2:</strong> Nhập <strong>Mật khẩu chủ</strong> để xác thực quyền chia sẻ bảo mật (ngăn ngừa người lạ tự ý chia sẻ khi bạn rời máy).
      </li>
      <li>
        <strong>Bước 3:</strong> Nhấp <strong>"Sao chép Link"</strong> và gửi liên kết cho bạn bè. Người nhận chỉ cần mở liên kết trên trình duyệt là có thể cùng soạn thảo ngay lập tức!
      </li>
    </ol>

    <blockquote>
      <strong>Lưu ý bảo mật:</strong> Mọi thao tác gõ phím và bình luận đều được mã hóa bằng thuật toán quân sự <strong>AES-256-GCM</strong> trước khi truyền qua mạng.
    </blockquote>
  `
};
