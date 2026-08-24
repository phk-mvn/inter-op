fn main() {
    #[cfg(windows)]
    {
        let mut res = winres::WindowsResource::new();
        // Version is packed as (major<<48)|(minor<<32)|(build<<16)|revision
        let v: u64 = ((0u64) << 48) | ((4u64) << 32) | ((0u64) << 16) | 0u64;
        res.set_version_info(winres::VersionInfo::FILEVERSION, v);
        res.set_version_info(winres::VersionInfo::PRODUCTVERSION, v);
        res.compile().expect("failed to embed Windows version resource");
    }
}
